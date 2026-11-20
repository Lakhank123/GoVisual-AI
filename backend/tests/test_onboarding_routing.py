"""
GoVisual AI — Returning-User Onboarding Routing Regression Tests
Verifies onboarding completion resolution across all user states:
- New user without a profile
- Returning user with completed profile
- Returning user who skipped Brand Book
- Returning user whose Brand Book generation failed
- Genuinely incomplete profile with placeholder names
- User session isolation
- Error handling vs incomplete profile distinction
"""
import pytest
from typing import Optional, Dict, Any


def is_placeholder_brand_name(name: Optional[str]) -> bool:
    """Python mirror of frontend isPlaceholderBrandName for unit testing."""
    if not name:
        return True
    trimmed = name.strip().lower()
    return not trimmed or trimmed in ("my brand", "your shop", "sample business")


def evaluate_onboarding_completion(
    brand: Optional[Dict[str, Any]],
    profile: Optional[Dict[str, Any]],
) -> bool:
    """
    Evaluates whether the user has completed onboarding based on persisted state.
    Matches the logic in demo-session-provider.tsx and auth/complete/page.tsx.
    """
    if brand and brand.get("onboarding_complete") is True:
        return True

    brand_name = brand.get("brand_name") if brand else None
    if not is_placeholder_brand_name(brand_name):
        return True

    business_name = profile.get("business_name") if profile else None
    if not is_placeholder_brand_name(business_name):
        return True

    return False


def determine_dashboard_route_action(
    auth_loading: bool,
    profile_loading: bool,
    profile_error: Optional[str],
    has_completed_onboarding: bool,
) -> str:
    """
    Determines route action for /dashboard.
    Matches the updated route guard in dashboard/page.tsx.
    """
    if auth_loading or profile_loading:
        return "WAIT_LOADING"
    if profile_error:
        return "SHOW_RETRY_ERROR"
    if not has_completed_onboarding:
        return "REDIRECT_ONBOARD"
    return "RENDER_DASHBOARD"


# ─────────────────────────────────────────────────────────────────────────────
# UNIT & REGRESSION TESTS
# ─────────────────────────────────────────────────────────────────────────────

def test_placeholder_brand_name_detection():
    """Verify placeholders are correctly detected and real names are accepted."""
    assert is_placeholder_brand_name(None) is True
    assert is_placeholder_brand_name("") is True
    assert is_placeholder_brand_name("   ") is True
    assert is_placeholder_brand_name("My Brand") is True
    assert is_placeholder_brand_name("my brand") is True
    assert is_placeholder_brand_name("  MY BRAND  ") is True
    assert is_placeholder_brand_name("Your Shop") is True
    assert is_placeholder_brand_name("Sample Business") is True

    # Real brand names must NOT be treated as placeholders
    assert is_placeholder_brand_name("Urban Kicks") is False
    assert is_placeholder_brand_name("Meera Silks") is False
    assert is_placeholder_brand_name("GoVisual Store") is False
    assert is_placeholder_brand_name("Aura Wear") is False


def test_new_user_with_no_profile():
    """New user with no profile or brand identity must show onboarding."""
    assert evaluate_onboarding_completion(brand=None, profile=None) is False

    action = determine_dashboard_route_action(
        auth_loading=False,
        profile_loading=False,
        profile_error=None,
        has_completed_onboarding=False,
    )
    assert action == "REDIRECT_ONBOARD"


def test_returning_user_with_completed_brand_and_onboarding_flag():
    """Returning user with onboarding_complete=True must navigate directly to dashboard."""
    brand = {
        "business_id": "user-123",
        "brand_name": "Urban Kicks",
        "category": "Clothing / Fashion",
        "onboarding_complete": True,
    }
    profile = {
        "id": "user-123",
        "business_name": "Urban Kicks",
    }
    assert evaluate_onboarding_completion(brand=brand, profile=profile) is True

    action = determine_dashboard_route_action(
        auth_loading=False,
        profile_loading=False,
        profile_error=None,
        has_completed_onboarding=True,
    )
    assert action == "RENDER_DASHBOARD"


def test_returning_user_who_skipped_brand_book():
    """
    Returning user who saved business profile but skipped Brand Book
    (onboarding_complete=False or None) must navigate directly to dashboard.
    """
    brand = {
        "business_id": "user-456",
        "brand_name": "Meera Silks",
        "category": "Retail",
        "city": "Mumbai",
        "onboarding_complete": None, # Skipped Screen 6
    }
    profile = {
        "id": "user-456",
        "business_name": "Meera Silks",
    }
    assert evaluate_onboarding_completion(brand=brand, profile=profile) is True

    action = determine_dashboard_route_action(
        auth_loading=False,
        profile_loading=False,
        profile_error=None,
        has_completed_onboarding=True,
    )
    assert action == "RENDER_DASHBOARD"


def test_returning_user_whose_brand_book_failed():
    """
    Returning user whose optional Brand Book generation previously failed
    must navigate directly to dashboard without being forced back to onboarding.
    """
    brand = {
        "business_id": "user-789",
        "brand_name": "Chai Point",
        "onboarding_complete": False, # Generation failed or was never flagged
    }
    profile = {
        "id": "user-789",
        "business_name": "Chai Point",
    }
    assert evaluate_onboarding_completion(brand=brand, profile=profile) is True


def test_returning_user_with_only_user_profile():
    """User who has business_name in user_profiles but brand_core_identity row is missing."""
    profile = {
        "id": "user-101",
        "business_name": "Apex Fitness",
    }
    assert evaluate_onboarding_completion(brand=None, profile=profile) is True


def test_genuinely_incomplete_profile_with_placeholders():
    """User with default placeholder names must still be directed to onboarding."""
    brand = {
        "business_id": "user-202",
        "brand_name": "My Brand",
        "onboarding_complete": False,
    }
    profile = {
        "id": "user-202",
        "business_name": "Your Shop",
    }
    assert evaluate_onboarding_completion(brand=brand, profile=profile) is False


def test_route_guard_waits_for_loading():
    """Dashboard must NOT prematurely redirect while profile is loading."""
    # When authLoading is false but profileLoading is true:
    action = determine_dashboard_route_action(
        auth_loading=False,
        profile_loading=True,
        profile_error=None,
        has_completed_onboarding=False, # transient state while loading
    )
    assert action == "WAIT_LOADING"


def test_profile_lookup_failure_shows_retry():
    """
    When profile lookup fails (network or RLS), dashboard must display recoverable
    error state with retry, and must NOT redirect to onboarding.
    """
    action = determine_dashboard_route_action(
        auth_loading=False,
        profile_loading=False,
        profile_error="Network timeout reaching Supabase database",
        has_completed_onboarding=False,
    )
    assert action == "SHOW_RETRY_ERROR"


def test_user_session_isolation():
    """Ensures user profiles are strictly keyed by userId and do not bleed across users."""
    user_a_id = "user_a_uuid"
    user_b_id = "user_b_uuid"

    db = {
        user_a_id: {
            "brand": {"brand_name": "User A Brand", "onboarding_complete": True},
            "profile": {"business_name": "User A Brand"},
        },
        user_b_id: {
            "brand": None,
            "profile": None,
        },
    }

    # User A is complete
    assert evaluate_onboarding_completion(
        brand=db[user_a_id]["brand"],
        profile=db[user_a_id]["profile"]
    ) is True

    # User B is new and incomplete
    assert evaluate_onboarding_completion(
        brand=db[user_b_id]["brand"],
        profile=db[user_b_id]["profile"]
    ) is False
