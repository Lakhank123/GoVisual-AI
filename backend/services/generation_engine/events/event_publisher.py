import logging
from typing import Dict, Any, Callable, List
from .lifecycle_events import LifecycleEvent

logger = logging.getLogger(__name__)

class EventPublisher:
    def __init__(self):
        self.subscribers: Dict[LifecycleEvent, List[Callable]] = {}

    def subscribe(self, event: LifecycleEvent, callback: Callable[[LifecycleEvent, Dict[str, Any]], None]):
        """Subscribe a callback to a specific event name."""
        if event not in self.subscribers:
            self.subscribers[event] = []
        self.subscribers[event].append(callback)

    def publish(self, event: LifecycleEvent, payload: Dict[str, Any]):
        """Publish an event to all subscribers."""
        logger.info(f"Event published: {event.value} | payload: {payload}")
        if event in self.subscribers:
            for callback in self.subscribers[event]:
                try:
                    callback(event, payload)
                except Exception as e:
                    logger.error(f"Error in event subscriber for {event.value}: {str(e)}")

# Global singleton
event_publisher = EventPublisher()
