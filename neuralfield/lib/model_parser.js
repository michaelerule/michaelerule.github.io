
__greeknames = ['upbackepsilon', 'varepsilonup', 'upvarepsilon', 'backepsilon', 'varthetaup', 'varsigmaup', 'varepsilon', 'upvartheta', 'upvarsigma', 'turnediota', 'varvarrho', 'upupsilon', 'upsilonup', 'upepsilon', 'epsilonup', 'varvarpi', 'vartheta', 'varsigma', 'varrhoup', 'varphiup', 'varkappa', 'upvarrho', 'upvarphi', 'uplambda', 'lambdaup', 'varpiup', 'varbeta', 'upvarpi', 'uptheta', 'upsilon', 'upsigma', 'upomega', 'upkappa', 'upgamma', 'updelta', 'upalpha', 'thetaup', 'sigmaup', 'omegaup', 'kappaup', 'gammaup', 'epsilon', 'deltaup', 'alphaup', 'Upsilon', 'zetaup', 'varrho', 'varphi', 'upzeta', 'upiota', 'upbeta', 'lambda', 'iotaup', 'daleth', 'betaup', 'Lambda', 'varpi', 'uptau', 'uprho', 'uppsi', 'upphi', 'upeta', 'upchi', 'theta', 'tauup', 'sigma', 'rhoup', 'psiup', 'phiup', 'omega', 'kappa', 'gimel', 'gamma', 'etaup', 'delta', 'chiup', 'alpha', 'aleph', 'Theta', 'Sigma', 'Omega', 'Gamma', 'Delta', 'zeta', 'xiup', 'vary', 'varw', 'varv', 'varg', 'upxi', 'uppi', 'upnu', 'upmu', 'piup', 'nuup', 'muup', 'iota', 'beth', 'beta', 'tau', 'rho', 'psi', 'phi', 'mho', 'eta', 'chi', 'Psi', 'Phi', 'xi', 'pi', 'nu', 'mu', 'Xi', 'Pi'];


/**
 * Transforms identifier string into LaTeX for prettier formatting
 * The first character is treated as a variable name
 * Subsequent characters are treated as subscripts
 */
function latex(s) {
    s = s.trim(); // remove leading and trailing whitespace
    if (s.length<1) return s; // empty string?

    for (var i=0; i<__greeknames.length; i++) {
        var name = __greeknames[i];
        // note: padding name in \\b causes it to replace only whole words
        s=s.replace(new RegExp('\\b'+name+'\\b','g'),'\\'+name);
    }
    
    /*
    // The first character is treated as a variable name
    var first = s[0];
    var texed = '$'+first;
    // Subsequent characters are treated as subscripts
    if (s.length>1) {
        var subscript = s.slice(1);
        texed+='_{'+subscript+'}';
    }
    return texed+'$';
    */
    return s;//'$'+s+'$';
}




/** 
 * Parse a description of model controls embedded in HTML. 
 * This is a brittle parser -- a stopgap on the way to something 
 * more elegant.
 * 
 * grabs div by id tag_id and converts it to HTML
 * 
 * returns a name-->value mapping of initial variable values
 */
function interpret_abbreviated_controls(controls) {
    var as_string = controls.innerHTML;
    var lines     = as_string.split('\n');
    var nlines    = lines.length;
    var parsed    = ''; // auto-generated HTML for control elements
    var variables = {}; // name--> value mapping
    var in_group = false;
    for (var i=0; i<nlines; i++) {
        var line  = lines[i];
        var words = line.match(/\S+/g);
        if (!words||words.length<1) continue;
        var nwords = words.length;
        var verb   = words[0]
        switch(verb) {
            case 'group':
                if (in_group) { // need to close current group
                    parsed += '</div>\n';
                    in_group = false;
                }
                // begin a new group
                var groupname = words.slice(1).join(' ');
                parsed += '<div class="controls"><h4>'+groupname+'</h4><br/>';
                in_group = true;
                break;
            case 'par':
                if (!words.length>=3) {
                    console.log('Error in parameter line '+i);
                    console.log(line);
                }
                var varname  = words[1];
                var value    = eval(words[2]) || 0;
                var varmin   = words[3] || null;
                var varmax   = words[4] || null;
                parsed += '<div class="control">'+'$'+latex(varname)+'$';//'$'+varname+'$';//latex(varname);
                parsed += '<input type="number" ';
                parsed += 'name="'+varname+'" ';
                parsed += 'value="'+value+'" ';
                parsed += 'step="'+(words[5] || 0.1)+'" ';
                if (varmin) parsed += 'min="'+varmin+'" ';
                if (varmax) parsed += 'max="'+varmax+'" ';
                parsed += '/>\n';
                parsed += '</div>\n'; 
                variables[varname]=value;
                break;   
            case 'button':
                if (!words.length>=1) {
                    console.log('Error in parameter line '+i);
                    console.log(line);
                }
                var varname  = words.slice(1).join(' ');
                parsed += '<input class="button" ';
                parsed += 'type="button" ';
                parsed += 'value="'+varname+'" ';
                parsed += '/>\n';
                break;      
        }
    }
    if (in_group) { // need to close group
        parsed += '</div>\n';
        in_group = false;
    }
    controls.innerHTML = parsed;
    console.log(variables);
    console.log(parsed);
    return variables;
}


