# Install:

# Create a local virtual environment for the project
C:/Users/[User]/AppData/Local/Microsoft/WindowsApps/python3.13.exe -m venv .venv

# Activate the venv in PowerShell
.\.venv\Scripts\Activate.ps1

# Install the Spotify Pedalboard package
python -m pip install --upgrade pip
python -m pip install pedalboard

# Run the example script
python play_quarter_notes.py

# React + TypeScript browser synth with Tone.js
# Install Node.js first if needed: https://nodejs.org/

# From this folder, install the app dependencies
npm install

# Start the Vite dev server
npm run dev

# Then open:
# http://127.0.0.1:5173/

# Prompts:
### Attempt to generate sound on the server side:
Generate a simple python script that uses Spotify's pedalboard to generate play four quarter notes, C E G C. These should be audible on my wondows 11 box. Use **pedalboard.io.AudioStream** so that, later, we can add some realtime controls.
### Attempt to generate sound on the client side:
Let's try a new approach of making a client side browser synthesizer. generate a web page with a single button that plays a C quarter note when you click a button using tone.js. Add a new section to NOTES.md that describes how to install any needed packages and start the web server.

Refactor this page to use react with typescript, and update NOTES.md

Update App.tsx with the following: Add a large full width container div to the center of the page. Within the div, if you double click, a 50x50 px square div or a random color is added centered on where you clicked. If you drag the square div, you can drag it around inside the container div.
--
I am building a sime web based sequencer. In App.tsx the user can place a set of boxes. Add a 1 pixel wide green line that is the same height as the container div. Animate this line to move from left to right. It should take 8 seconds. Once it reaches the left side it should loop. It's position should be a state variable that we'll use later.

For the next step, we'll need the x position of the green line and the x position of the left side of each square. Update the code such that when the green line passes the left edge of each square, a random note is played between C3 and C5.

Make the following changes: For each square, add a number called stackHeight to it's state. Display this number in the center of each square. If you click on the square, increment it's stackHeight mod 8. stackHeight deafults to 1.

If you double click on a square, delete it. Make the random square colors very bright, and make the stackHeight number black and larger.

The double click on a square should only delete the square you double clicke on, and it should not create a new square. Currently it does both.

Similarly, drag release should not trigger a click that increments stackHeight.

Add a state variable called currentKey. Replace #sym:playRandomNote with playNodeInKey. playNodeInKey takes the current key, adds the number of scale degrees equal to the stackHeightof this square, and plays that note.

Over time, the current code starts using more resources and creating sound processing chirps. update this to use best practices for resource allocation for Tone.js synthisizers.
--
We're creating a synth UI that operates in a browser: squares represent notes, and a green sweeping line represents where we are in the timeline, from left to right.  Now we're adding a new feature: tracks. For the first step, inside the container div, and under the set of squares, add four sections, each 25% of the height and 100% of the width.  The top section should be dark green with the word "Melody" in grey in the top left. The next section should be dark yellow with the word "Harmony" in grey in the top left. The next section should be dark orange with the word "Bass" in grey in the top left. The last section should be dark blue with the word "Rhythm" in grey in the top left.

Now we are going to treat the behavior of squares in each track differently based on their centerpoint.  First let's give each track its own sound.  Instead of a single synthRef, create four: melodySynthRef, harmonySynthRef, bassSynthRef, and rhythmSynthRef.  For each synthRef, create an appropriate Tone.PolySynth.  In #sym:playNodeInKey , if the center of the square falls within the melody, harmony, bass, or rhythm track, play the corrisponding synth sound.

When I doulble click, the word "melody" is selected. Use CSS to turn off text selection for this page.
Using css make the boxes make a bright white pulse that fade to the original color when it's note is played.
Add a large trash can icon under the main container div. Make it so that if you drag a square there, it is deleted.
Remove the feature where double clicking deletes the square.
Update this so that if I double click on a square, it does not create a new square.

This page implements a multi-track UX for a synthesizer.  We are now doing to allow users to switch between synthesis composition modes while retaining the basic square dragging UX.  First, add a state variable called compositionMode.  Add two buttons, one labeled "Major", one labeled "Pentatonic".  By default, the compositionMode should be "Major".  The current compositional mode button should be a bright color with black text, font-size: 24px. All other compositional mode buttons should have a transparent background and the text and border should be dark.

The unselected buttons are too hard to see. Make the text and border lighter and not transparent.

We're going to do some refactoring of #sym:playNodeInKey so that each mode plays notes in a different way.  Create a map from compositionMode ("Major", "Pentatonic") to a play function (playMajor()), playPentatonic()).  Rename #sym:playNodeInKey  to handlePlayEvent.  Create two play functions.  playMajor() should use the code in #sym:playNodeInKey  with no changes.  The second, playPentatonic(), should be just like playMajor(), but it chooses from the pentatonic scale degrees [0, 2, 4, 7, 8] mod 5.

