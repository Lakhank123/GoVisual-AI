# How to Create the Indian Avatar Photos

## Overview
You need to create 7 professional Indian model photos
(1 per avatar, except "No Avatar" which needs no image).
These are static assets placed in this folder.

## Step-by-Step Instructions

### Step 1 — Open ChatGPT (GPT-4o with image generation)
Go to chat.openai.com and make sure you are using
GPT-4o or the DALL-E image generation feature.

### Step 2 — Generate Each Avatar
For each avatar in avatars.json, copy the "chatgpt_prompt"
field and send it to ChatGPT image generation.

Generate 3–4 variations per avatar and pick the best one.

### Step 3 — Save the Images
Save each image with the filename from the "filename" field:
  priya.jpg
  rahul.jpg
  sunita.jpg
  arjun.jpg
  kavya.jpg
  ramesh.jpg
  anjali.jpg

Recommended size: 800x1000 pixels (portrait)
Format: JPG, quality 90%
Background: white or very light (makes compositing easier)

### Step 4 — Place in This Folder
Put all 7 images in:
  frontend/public/avatars/

### Step 5 — Verify
After placing images, open your Next.js app and go to
/photoshoot — you should see the avatar faces in the
selection grid instead of emoji placeholders.

## Important Notes
- All images should have a clean, uncluttered background
- The model should be centered in the frame
- Avoid images with busy backgrounds
- Portrait orientation (taller than wide) works best
- These images are only used as REFERENCE for the
  Gemini AI — it will composite your product with
  the avatar's style, not paste them together literally
