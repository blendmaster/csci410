// This file is part of the materials accompanying the book 
// "The Elements of Computing Systems" by Nisan and Schocken, 
// MIT Press. Book site: www.idc.ac.il/tecs
// File name: projects/04/Mult.asm

// Multiplies R0 and R1 and stores the result in R2.
// (R0, R1, R2 refer to RAM[0], RAM[1], and RAM[2], respectively.)

// Put your code here.

//clear output and counter
@2
M = 0
@3
M = 0
//done if either value is zero
@0
D = M
@end
D;JEQ
@1
D = M
@end
D;JEQ 

(while)
//add ram[1] to ram[2]
@1
D = M
@2
M = M + D
// increment addition count in ram[3]
@3
M = M + 1
//stop if greater than ram[0]
D = M
@0
D = M-D
@end
D;JEQ //once ram[3] exceeds ram[0]
@while
A; JMP //back to while
(end)
