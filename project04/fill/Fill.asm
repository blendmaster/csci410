// This file is part of the materials accompanying the book 
// "The Elements of Computing Systems" by Nisan and Schocken, 
// MIT Press. Book site: www.idc.ac.il/tecs
// File name: projects/04/Fill.asm

// Runs an infinite loop that listens to the keyboard input. 
// When a key is pressed (any key), the program blackens the screen,
// i.e. writes "black" in every pixel. When no key is pressed, 
// the screen should be cleared.

// Put your code here.

//store position in ram0
@SCREEN
D = A
@0
M = D
(loop)
	//fill or clear based on keyboard
	@KBD
	D = M
	@clear
	D;JEQ
(fill)
	// read ram0 to D
	@0
	D = M
	//blacken screen
	A = D 
	M = 0
	M = !M
(inc)
	//increment counter and store
	D = D + 1
	@0
	M = D
	//reset to @screen if at end
	@8192 //number of blocks in screen 
	D = D - A
	@SCREEN
	D = D - A
	@skipreset
	D;JLE
	//ram0 to screen
	@screen
	D = A
	@0
	M = D
(skipreset)
	@loop
	A;JMP
(clear)
	// read ram0 to D
	@0
	D = M
	//clear screen
	A = D 
	M = 0
	//back to increment
	@inc
	A; JMP
