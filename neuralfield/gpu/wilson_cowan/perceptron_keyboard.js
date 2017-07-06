
function bind_perceptron_key_listener(perceptron_model) {
    document.onkeypress = function(e) {
        var k = (e.which) ? e.which : e.keyCode;
        console.log('Key pressed: '+k);
        apply_perceptron_key_event(k, perceptron_model);
        perceptron_model.compile_kernel();
    };
}

/** Takes a key code and a perceptron state model, and modified the state model
  */
function apply_perceptron_key_event(k, perceptron_model) {
    // Common key codes (not exclusive)
    // # denotes numeric keypad codes (distinct from numbers in a row
    // above QWERTYy.
    switch (k) {
        case  8: /*BACKSP*/ break;
        case  9: /*TAB*/ break;
        case 13: /*ENTER*/ break;
        case 16: /*SHFT*/ break;
        case 17: /*CTRL*/ break;
        case 18: /*ALT*/ break;
        case 19: /*PAUSE*/ break;
        case 20: /*CAPS*/ break;
        case 27: /*ESC*/ break;
        case 32: /*SPACE*/ break;
        case 33: /*PGUP*/ break;
        case 34: /*PGDOWN*/ break;
        case 35: /*END*/ break;
        case 36: /*HOME*/ break;
        case 37: /*LEFT*/ break;
        case 38: /*RIGHT*/ break;
        case 39: /*UP*/ break;
        case 40: /*DOWN*/ break;
        case 42: /*PRINTSC*/ break;
        case 45: /*INS*/ break;
        case 46: /*DEL*/ break;
        case 91: /*LEFTWIN*/ break;
        case 92: /*RIGHTWIN*/ break;
        case 93: /*SELECT*/ break;
        case 144: /*NUMLOCK*/ break;
        case 145: /*SCROLLLOCK*/ break;

        case 126: /*~*/ break;
        case 33: /*!*/ break;
        case 64: /*@*/ break;
        case 35: /*#*/ break;
        case 36: /*$*/ break;
        case 37: /*%*/ break;
        case 94: /*^*/ break;
        case 38: /*&*/ break;
        case 42: /***/ break;
        case 106: /*#**/ break;
        case 40: /*(*/ break;
        case 41: /*)*/ break;
        case 95: /*_*/ 
        break;

        case 43: /*+*/ 
        // only applies to keydown? otherwise a letter? case 107: /*#+*/ 
        break;

        case 48 : /*0*/ 
        // only applies to keydown? otherwise a letter? case 96 : /*#0*/    
        break;
        case 49 : /*1*/ 
        // only applies to keydown? otherwise a letter? case 97 : /*#1*/ 
        break;
        case 50 : /*2*/ 
        // only applies to keydown? otherwise a letter? case 98 : /*#2*/ 
        break;
        case 51 : /*3*/ 
        // only applies to keydown? otherwise a letter? case 99 : /*#3*/ 
        break;
        case 52 : /*4*/ 
        // only applies to keydown? otherwise a letter? case 100: /*#4*/ 
        break;
        case 53 : /*5*/ 
        // only applies to keydown? otherwise a letter? case 101: /*#5*/ 
        break;
        case 54 : /*6*/ 
        // only applies to keydown? otherwise a letter? case 102: /*#6*/ 
        break;
        case 55 : /*7*/ 
        // only applies to keydown? otherwise a letter? case 103: /*#7*/ 
        break;
        case 56 : /*8*/ 
        // only applies to keydown? otherwise a letter? case 104: /*#8*/ 
        break;
        case 57 : /*9*/ 
        // only applies to keydown? otherwise a letter? case 105: /*#9*/ 
        break;

        case 97 : /*a*/ break;
        case 65 : /*A*/ break;
        case 98 : /*b*/ break;
        case 66 : /*B*/ break;
        case 99 : /*c*/ break;
        case 67 : /*C*/ break;
        case 100: /*d*/ break;
        case 68 : /*D*/ break;
        case 101: /*e*/ break;
        case 69 : /*E*/ break;
        case 102: /*f*/ break;
        case 70 : /*F*/ break;
        case 103: /*g*/ break;
        case 71 : /*G*/ break;
        case 104: /*h*/ break;
        case 72 : /*H*/ break;
        case 105: /*i*/ break;
        case 73 : /*I*/ break;
        case 106: /*j*/ break;
        case 74 : /*J*/ break;
        case 107: /*k*/ break;
        case 75 : /*K*/ break;
        case 108: /*l*/ break;
        case 76 : /*L*/ break;
        case 109: /*m*/ break;
        case 77 : /*M*/ break;
        case 110: /*n*/ break;
        case 78 : /*N*/ break;
        case 111: /*o*/ break;
        case 79 : /*O*/ break;
        case 112: /*p*/ break;
        case 80 : /*P*/ break;
        case 113: /*q*/ break;
        case 81 : /*Q*/ break;
        case 114: /*r*/ break;
        case 82 : /*R*/ break;
        case 115: /*s*/ break;
        case 83 : /*S*/ break;
        case 116: /*t*/ break;
        case 84 : /*T*/ break;
        case 117: /*u*/ break;
        case 85 : /*U*/ break;
        case 118: /*v*/ break;
        case 86 : /*V*/ break;
        case 119: /*w*/ break;
        case 87 : /*W*/ break;
        case 120: /*x*/ break;
        case 88 : /*X*/ break;
        case 121: /*y*/ break;
        case 89 : /*Y*/ break;
        case 122: /*z*/ break;
        case 90 : /*Z*/ break;

        case 112: /*F1*/ break;
        case 113: /*F2*/ break;
        case 114: /*F3*/ break;
        case 115: /*F4*/ break;
        case 116: /*F5*/ break;
        case 117: /*F6*/ break;
        case 118: /*F7*/ break;
        case 119: /*F8*/ break;
        case 120: /*F9*/ break;
        case 121: /*F10*/ break;
        case 122: /*F11*/ break;
        case 123: /*F12*/ break;

        case 186: /*;*/ break;
        case 187: /*=*/ break;
        case 188: /*,*/ break;
        case 189: /*-*/ break;
        case 108: /*#-*/ break;
        case 190: /*.*/ break;
        case 109: /*#.*/ break;
        case 191: /*/*/ break;
        case 110: /*#/*/ break;
        case 192: /*\*/ break;
        case 193: /*`*/ break;
        case 194: /*[*/ break;
        case 195: /*]*/ break;
        case 196: /*'*/ break;
        
        // OSX can generate many more key-typed events
        // including combinind modifiers, etc. 
        // they are not documented here. 
    }
}
