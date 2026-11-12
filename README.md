# MGIS-Individual-Build
Tune N' Teach

A web app for guitar tuning and storing guitar lessons. The home page has options between acoustic and electric guitar or lessons. Once entering the guitar sections there will be options to tune them to any way the user would like, and an option for presets. In the lessons tab, there will be stored YouTube videos of how to play certain songs, what songs the user knows, and what songs they're actively learning.

Data Layer:
Contains target frequencies for each string across standard and alternate tunings. It should also have tuning presets: standard tuning, drop d, and others. This should also allow the user to create their own presets for specific songs that have different tunings.

It should also have a way to actively store YouTube lessons that are inputted by the user, so they can save and access them whenever they'd want to learn or recall a song. The videos should be accessible through a hyperlink that displays the title of the lesson.

Processing Layer:
The app should access the device's microphone and listen to the sound and frequency of the individual string that is plucked. Once each are determined, they will be compared to what exists in the data layer. From there it will process and give feedback of whether the string is too sharp, too flat, or perfect.

Presentation Layer:
At the home page, displays a photo of both an acoustic or electric guitar. Once entering each option the display should look similar to Fender Tune with each string labeled at the bottom. When receiving an input of sound, there should be a circle like in Fender Tune that adjusts based on how the tuning differs from the target goal. If it is too high or too low, the circle should move right or left in correspondence and be yellow until it matches the actual tuning desired, where it will turn green.
