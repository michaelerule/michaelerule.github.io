function htmlentities(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/(?:\r\n|\r|\n)/g,'<br/>');
}


function main(variables) {

    // set up axis titles and labels for the four subplots
    for (var i=1; i<=4; i++) {
        eval(`document.getElementById('subplot${i}title' ).innerHTML = panel${i}.title  || ''`);
        eval(`document.getElementById('subplot${i}xlabel').innerHTML = panel${i}.xlabel || ''`);
        eval(`document.getElementById('subplot${i}ylabel').innerHTML = panel${i}.ylabel || ''`);
    }

    // Gather GUI elements
    var hidingframe   = document.getElementById('hidingframe');
    var canvasoverlay = document.getElementById('canvasoverlay');
    var clickblock    = document.getElementById('clickblock');
    var canvas        = document.getElementById('maincanvas');
    var frame         = document.getElementById('canvasdiv');
    var error_panel   = document.getElementById('hidingframe');

    // global boolean to coordinate start/stop simulation
    var running   = 0;

    // Initialize constants relating to on-screen sizes, lengths, etc
    var downscale = 1;
    var W         = canvas.clientWidth >>downscale;
    var H         = canvas.clientHeight>>downscale;
    var W2        = W*2|0;
    var H2        = H*2|0;
    var N         = W*H|0;
    var middle    = W/2|0;
    var dY        = H*2*W;
    var M         = 4*W*H;

    // constants for drawing phase-plane subplots
    var plot_padding = 72>>downscale;
    var mg           = plot_padding/2|0; // plot margin
    var SW           = W-plot_padding|0;   // plot width

    // radius of circular stimulus mask and smoothness (pixels)
    var mask_radius     = 20;
    var structure_scale = 3;

    // Get a 2D rendering context, and bind an image buffer to it
    canvas.width  = W2;
    canvas.height = H2;
    var ctx       = canvas.getContext('2d');
    var imageData = ctx.getImageData(0,0,W*2,H*2);
    var data      = new Uint32Array(imageData.data.buffer);
    ctx.putImageData(imageData, 0, 0);

    // Get a (very poor! very fast.) random number generator
    var rng = WeakRNG();

    // Dynamically generate user-controlled local variables
    var create_vars = '';
    for (var varname in variables) if (variables.hasOwnProperty(varname))
        create_vars += 'var '+varname+' = '+variables[varname]+';\n';
    eval(create_vars);


    // Define standard auxiliary functions and constants
    var E    = Math.E;
    var PI   = Math.PI;
    var sin  = Math.sin;
    var abs  = Math.abs;
    var sin  = Math.sin;
    var cos  = Math.cos;
    var tan  = Math.tan;
    var exp  = Math.exp;
    var log  = Math.log;
    var floor= Math.floor;
    var ceil = Math.ceil;
    var pow  = Math.pow;
    var sqrt = Math.sqrt;
    var max  = Math.max;
    var min  = Math.min;
    
    var mathnames = "var E    = Math.E;    var PI   = Math.PI;    var sin  = Math.sin;    var abs  = Math.abs;    var sin  = Math.sin;    var cos  = Math.cos;    var tan  = Math.tan;    var exp  = Math.exp;    var log  = Math.log;    var floor= Math.floor;    var ceil = Math.ceil;    var pow  = Math.pow;    var sqrt = Math.sqrt;    var max  = Math.max;    var min  = Math.min;";
    
    // step function
    function heav(z) { return z<0.0? 0.0 : z==0.0? 0.5 : 1.0; }
    // firing nonlinearity
    function __f(x) { return 1/(1+Math.exp(-x)); }
    // Make a lookup table for firing rate nonlinearity
    // since exponentiation is too slow
    var nonlinearity_lookup = new Float32Array(new ArrayBuffer(4096*4));
    for (var i=0; i<4096; i++) {
        var x = (i-2048)/256.0;
        nonlinearity_lookup[i]=__f(x);
    }
    function f(x) {
        var i = (x*256|0)+2048;
        if (i<0) return 0.0;
        if (i>=4096) return 1.0;
        return nonlinearity_lookup[i]
    }
    

    // Operator functions need to be defined so the model template
    // cen call them.
    // Parameter form is thus:
    //      input variable (right hand side) is 'field'
    //      shorthand e.g. Ke = \nabla Ue is the 'operator'
    //      params is an object with information needed to
    //       parameteriz ethe operator
    //
    // So far only convolution is defined
    //
    // In the future we'll define div, grad, curl, laplace, others
    function GCONV(field,operator,sigma) {
        blurGaussianFloat32SeparableAnisotropicAbsorbingRenormalizingPowerOfTwoSize(
            field,operator,temp,W,H,sigma,sigma);
    }


    // Dynamically allocate simulation memory buffers
    // Each field and linear operator is given a buffer
    // We also need some temporary buffers to store intermediates
    // and some buffers to hold cached phase plane data
    // hard-coding buffers for the phase planes for now
    var simbuffer = function() {
        return new Float32Array(new ArrayBuffer(N*4))
    };
    buffers = ['temp','mask','pp3dx','pp4dx','pp3dy','pp4dy'];
    for (var i=0;i<fields.length   ;i++) buffers.push(['__'+fields[i].name]);
    for (var i=0;i<operators.length;i++) buffers.push(['__'+operators[i].name]);
    create_buffers = '';
    for(var i=0; i<buffers.length; i++)
        create_buffers += 'var '+buffers[i]+'=simbuffer();\n';
    try{
        eval(create_buffers);
    } catch(err) {
        err.message = 
            'Error while creating phase plane template \n'+
            'Source code is:\n'+create_buffers +'\n\n' +
            err.message;
        error_panel.innerHTML = htmlentities(err.message);
        throw err;
    }

    // Both the dynamically generated code for rendering, 
    // and the integration kernel, load the current position into
    // local variables. This code depends only on the fields defined
    // and not the parameters, and so does not need to be regenerated.
    // Evaulate it once at the beginning to save time later.
    var loadb = '';
    for (var i=0;i<fields.length;i++)
        loadb+='var '+fields[i].name+'=__'+fields[i].name+'[i];\n';
    for (var i=0;i<operators.length;i++) 
        loadb+='var '+operators[i].name+'=__'+operators[i].name+'[i];\n';
    
    // We gain some speed improvement if we substiute parameters as
    // numeric constants and force the JIT to recompile our kernel
    // every time they change. The main kernel template stays the
    // same though, so we generate it once at the beginning.
    var kernel_source = 'function kernel(t) {\n';
    kernel_source += '/* kernel builder v1.2 */';
    // precompute linear operators
    for (var i=0;i<operators.length;i++) {
        var t  = operators[i].type;
        var of = operators[i].applyto;
        var n  = operators[i].name;
        var p  = operators[i].params;
        switch (t) {
            case 'GCONV':
                kernel_source += `${t}(__${of},__${n},${p.sigma});\n`;
                break;
        }
    }
    kernel_source += mathnames;
    // Loop header
    kernel_source+=`for (var y=0;y<H;y++) {
        var Y=y*W;
        for (var x=0;x<W;x++) {
        var i=x+Y;
        var s = mask[i]*amp;`;
    // load fields and operators into local vairables
    kernel_source += loadb;
    // Apply update equations
    for (var i=0;i<fields.length;i++) 
        kernel_source += 'var __d__'+fields[i].name+'='+fields[i].update+';\n';
    // save state
    for (var i=0;i<fields.length;i++) {
        var x = fields[i].name;
        kernel_source += '__'+x+'[i]='+x+'+__d__'+x+'*dt;\n';
    }
    // footer
    kernel_source += '}}}';
    // Convert free variables to template entries
    // There is a problem wherein this is matching partial
    for (var varname in variables) if (variables.hasOwnProperty(varname)) {
        var re = new RegExp('(?=^|[^a-zA-Z0-9_])'+varname+'(?=[^a-zA-Z0-9_]|$)','g')
        //var re = new RegExp(varname,'g')
        kernel_source = kernel_source.replace(re,'${'+varname+'}');
    }
    kernel_source = kernel_source.replace(new RegExp('RANDN', 'g'),'((rng.uniform()-0.5)*3.4641)');
    console.log(kernel_source);


    // Dynamically generate functions for finding the phase-plane
    // nullclines. User-specified equations are used to allow
    // the user to perform adiabatic elimination, ignore taus, etc
    // for now x and y ranges are clipped to [0,1]
    function zero_finder(due,dui,x,y,size) {
        var template = `
        function find_zeros(buffer1,buffer2) {
            var minx=-1, miny=-1, best=1e30;
            for (var y=0; y<${SW}; y++) {
                var ${y} = y/${SW};
                for (var x=0; x<${SW}; x++) {
                    var ${x} = x/${SW};
                    var due = ${due};
                    var dui = ${dui};
                    var mag = due*due+dui*dui;
                    if (mag<best) {best=mag; minx=x; miny=y;}
                    var i = x+${SW}*y;
                    buffer1[i]=due; buffer2[i]=dui;
                }
            }
            return {x:minx,y:miny};
        }`;
        console.log(template);

        try{
            eval(template);
        } catch(err) {
            err.message = 
                'Error while creating phase plane template \n'+
                'Source code is:\n'+template+'\n\n' +
                err.message;
            error_panel.innerHTML = htmlentities(err.message);
            throw err;
        }
        return find_zeros;
    }

    // Function for tracing nullclines given an array of x and y
    // derivatives
    function trace_nullclines(dx,dy,origin) {
            for (var y=1; y<SW; y++) {
            for (var x=1; x<SW; x++) {
                var i = x+SW*y;
                var xnull = (dx[i]>0)!=(dx[i-1]>0)||
                            (dx[i]>0)!=(dx[i-SW]>0);
                var ynull = (dy[i]>0)!=(dy[i-1]>0)||
                            (dy[i]>0)!=(dy[i-SW]>0);
                if (xnull)
                    data[x+(SW-y)*W2+origin]=0xff00ff00;
                else if (ynull)
                    data[x+(SW-y)*W2+origin]=0xff0088ff;
            }
        }
    };

    locate_zeros_panel3 = zero_finder(panel3.dx,panel3.dy,panel3.x,panel3.y);
    locate_zeros_panel4 = zero_finder(panel4.dx,panel4.dy,panel4.x,panel4.y);

    function render_scatter(field_x,field_y,dx,dy,origin,pskip) {
        // erase this subplot WxH starting at origin
        for (var y=0;y<W;y++) {
            var Y = y*W2+origin;
            for (var x=0;x<W;x++) data[x+Y]=0x00000000;
        }
        //render distribution of E/I positions in phase space
        pskip = pskip || 2;
        var offset = plot_padding*(W+1)+H*W2;
        for (var y=1; y<H; y+=pskip) {
            for (var x=1; x<W; x+=pskip) {
                var i = x+y*W;
                var a = field_x[i]*SW|0;
                var b = (1.-field_y[i])*SW|0;
                var j = a+b*W2+origin;
                data[j] = 0x01010101*(255-((255-((data[j])&0xff))*0.5|0));
            }
        }
        trace_nullclines(dx,dy,origin);
    }

    function field_image_template(origin,R,G,B) {
        var template = `
        for (var y=0;y<W;y++) {
            var Y = y*W2;
            for (var x=0;x<W;x++) {
                var i = x+y*W;
                ${loadb};
                data[x+Y+${origin}] 
                    = (${B}*255|0)*0x010000 + (${G}*255|0)*0x000100
                    + (${R}*255|0)*0x000001 + 0xff000000;
        }}`;
        return template;
    }
    
    var subplot1_template = field_image_template(0,panel1.R,panel1.G,panel1.B);
    var subplot2_template = field_image_template(W,panel2.R,panel2.G,panel2.B);
    var subplot3_template = `  
        render_scatter(__Ue,__Ui,pp3dx,pp3dy,${mg+W2*mg+W2*H});`;
    var subplot4_template = `
        render_scatter(__Ue,__Ui,pp4dx,pp4dy,${mg+W2*mg+W2*H+W});`;
    var graphics_template = `
    function sim2image() {
        ${subplot1_template};
        ${subplot2_template};
        ${subplot3_template};
        ${subplot4_template};
    }
    `;
    console.log(graphics_template);
    try{
        eval(graphics_template);
    } catch(err) {
        err.message = 
            'Error while creating graphics rendering template \n'+
            'Source code is:\n'+graphics_template +'\n\n' +
            err.message;
        error_panel.innerHTML = htmlentities(err.message);
        throw err;
    }

    function showSim() {
        sim2image();
        ctx.putImageData(imageData, 0, 0);
    }

    // initialization functions
    function randomize() {
        for (var j=0;j<fields.length;j++) {
            eval(`
            for (var y=0;y<H;++y) {
                rng.seed();
                for (var x=0;x<W;++x)
                   __${fields[j].name}[x+W*y] = rng.uniform();
            }`);
        }
        showSim();
    }

    // These initialization functions assume a particular model
    // They cannot be dynamically generated
    // In the future definition of these initial conditions must
    // be incorporated into the model description
    // These we can cheat with
    eval(`var perturb_x = __${panel3.x};`);
    eval(`var perturb_y = __${panel3.y};`);
    function perturbhomogeneous() {
        var p = locate_zeros_panel3(pp3dx,pp3dy);
        var ue = p.x/(1.0*SW);
        var ui = p.y/(1.0*SW);
        for (var y=0;y<H;++y)
        for (var x=0;x<W;++x) {
            var i = x+W*y;
            var r = 0.05*rng.uniform()
            var t = 6.2831853*rng.uniform()
            perturb_x[i] = ue+r*Math.cos(t);
            perturb_y[i] = ui+r*Math.sin(t);
        }
        showSim();
    }
    function ecellimpulse() {
        for (var y=0;y<H;++y)
        for (var x=0;x<W;++x) {
            var i = x+W*y;
            perturb_x[i] += .1
        }
        showSim();
    }
    function icellimpulse() {
        for (var y=0;y<H;++y)
        for (var x=0;x<W;++x) {
            var i = x+W*y;
            perturb_y[i] += .1
        }
        showSim();
    }
    function nothing() {}


    randomize();

    /*
    Prepare the user interface controls.
    All input fields have been given names that match local variable
    names. Rather than register an input-changed callback, currently we
    just poll input fields before each simulation update. First, we
    set the values of all input fields to match the initial state of these
    local control variables.
    */
    var inputs = document.getElementsByTagName("input");
    var controls = [];
    for (var i=0; i<inputs.length; i++)
        if (inputs[i].type=='number')
            controls.push(inputs[i]);
    function setcontrols() {
        for (var i=0; i<controls.length; i++)
            eval('controls[i].value='+controls[i].name);
    }
    function getcontrols(){
        try {
		for (var i=0; i<controls.length; i++)
		    eval(controls[i].name+'='+controls[i].value);
        } catch (err) {console.log(err.message);}
    }
    setcontrols();
    var buttons = [];
    var stopstartbutton; //needs to get modified so we need a handle to it
    for (var i=0; i<inputs.length; i++) {
        var button = inputs[i];
        if (button.type=='button') {
            buttons.push(button);
            button.onclick = (function(button){return function(click) {
                eval(button.value.replace(/\s/g,'').toLowerCase()+'()');
            };})(button);
            if (button.value=='Start') {
                stopstartbutton=button;
                button.style.width = button.offsetWidth;
            }
        }
    }
    function start() {
        if (!running) {
            running = 1;
            setTimeout(iterate, 0);
        }
        stopstartbutton.value="Stop";
        canvasoverlay.style.display = "none";
    }
    function stop() {
        if (running) running = 0;
        stopstartbutton.value="Start";
    }
    function step() {
        stop();
        iterate();
    }
    function statestring() {
        var state='';
        for (var i=0; i<controls.length; i++) {
            var control = controls[i];
            state += control.name+'='+control.value+';';
        }
        return state;
    }
    function save() {
        var wasrunning = running;
        stop();
        prompt("Copy (control+C) these parameters & record them.\nThey can be reloaded using the 'Load' button.\n", statestring());
        if (wasrunning) start();
    }
    function loadstring(s) {
        eval(s);
        setcontrols();
        compile_kernel();
        randomize();
        start();
    }
    function load() {
        stop();
        result = prompt("Paste saved parameters below:\n","");
        if (result) loadstring(result);
    }


    /*
    Create the preset buttons. Flicker buttons have their name shown.
    Fun preset buttons use a different class that displays the info string
    on the top left of the page on hover
    */
    var preset_buttons = [];
    var preset_container = document.getElementById('presets');
    for (var i=0; i<presets.length; i++) {
        var name = presets[i][0];
        var init = eval(presets[i][1]);
        var pdat = presets[i][2];
        var ps = document.createElement("div");
        ps.setAttribute("class","squarebutton");
        ps.innerHTML = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzαβγδεζηθικλμνξοπρστυφχψω'[i];
        var st = document.createElement("div");
        st.setAttribute("class","info");
        st.innerHTML = name;
        ps.appendChild(st);
        ps.onclick   = (function(name,init,pdat){
            return function() {
                init();
                eval(pdat);
                setcontrols();
                compile_kernel();
                console.log(name);
                start();
            };})(name,init,pdat);
        preset_container.appendChild(ps);
        preset_buttons.push(ps);
    }
    console.log('Presets loaded');
    if (preset_buttons.length>0) preset_buttons[0].onclick();


    // Set up stimulus mask
    for (var y=0;y<H;y++) {
        var Y=y*W;
        var dy=y-middle;
        for (var x=0;x<W;x++) {
            var i=x+Y;
            var dx = x-middle;
            if (dx*dx+dy*dy<mask_radius*mask_radius) mask[i]=1;
        }
    }
    GCONV(mask,mask,structure_scale);

    function kernel_template() {
        try{
            var templated = eval('`'+kernel_source+'`');
        } catch(err) {
            err.message = 
                'Error while templating kernel \n'+
                'Source template is:\n'+kernel_source + '\n\n' +
                err.message;
            error_panel.innerHTML = htmlentities(err.message);
            throw err;
        }
        try{
            eval(templated);
        } catch(err) {
            err.message = 
                'Error while building kernel \n'+
                'Source code is:\n'+templated +'\n\n' +
                err.message;
            error_panel.innerHTML = htmlentities(err.message);
            throw err;
        }
        return kernel;
    }
    var updateState = kernel_template();
    function compile_kernel() {
        getcontrols();
        // retrace nullclines
        locate_zeros_panel3(pp3dx,pp3dy);
        locate_zeros_panel4(pp4dx,pp4dy);
        // get new kernel
        updateState = kernel_template();
    }
    for (var i=0; i<controls.length; i++)
        controls[i].addEventListener('input',compile_kernel);
    compile_kernel();

    var timestep = 0;
    var frametime = +new Date(); // unary + is an integer cast here
    var framedelayms = 25;
    var nextframe = frametime+framedelayms;
    var frameskip = 1;
    function iterate() {
        rng.seed();
        updateState(timestep*dt);
        timestep += 1;
        if (frameskip<skip) frameskip++;
        else {
            showSim();
            frameskip=0;
        }
        if (running) requestAnimationFrame(iterate);
    }
    canvas.onmousedown = function(e) {if (running) stop(); else start();};

    hidingframe.style.display = "none";
    clickblock.style.display  = "none";
    clickblock.style.cursor   = "pointer";
    var startfun = function(e) {
        canvasoverlay.style.display = "none";
        clickblock.style.display    = "none";
        start();
    };
    clickblock.onclick    = startfun;
    canvasoverlay.onclick = startfun;

    console.log('Initialization complete');
}

/**
 * Overwrites obj1's values with obj2's and adds obj2's if non existent in obj1
 * @param obj1
 * @param obj2
 * @returns obj3 a new object based on obj1 and obj2
 */
function merge_options(obj1,obj2){
    var obj3 = {};
    for (var attrname in obj1) { obj3[attrname] = obj1[attrname]; }
    for (var attrname in obj2) { obj3[attrname] = obj2[attrname]; }
    return obj3;
}

function waitForMathJax() {
    // We need to preprocess the document to do some templating
    // Controls should be expanded early so MathJax can process
    // the LeTeX notation
    variables = {};
    var controls = document.getElementsByClassName("controlgroup");
    for (var i=0; i<controls.length; i++) {
        variables = merge_options(variables,interpret_abbreviated_controls(controls[i]));
    }
    var buttons   = interpret_abbreviated_controls(document.getElementById('buttongroups'));

    // Put equations in place?
    var equationplace = document.getElementById("equation");
    var eqns = '';
    for (var i=0;i<fields.length;i++) {
        var x = fields[i].name;
        var u = fields[i].update;
        u=u.replace(new RegExp('RANDN','g'),'\\eta ');
        u=u.replace(new RegExp('[*]','g'),'\\cdot ');
        eqns+=`$\\frac{\\partial ${x}}{\\partial t} = ${u}$<br/>`;
    }
    for (var i=0;i<operators.length;i++) {
        var o = operators[i];
        var n = o.name;
        var t = o.type;
        var a = o.applyto;
        var p = o.params;
        switch (t) {
            case 'GCONV':
                eqns+=`$${n}(x,y,t)=\\frac{1}{2\\pi \\cdot ${p.sigma}}\\exp\\left[{\\frac{x^2+y^2}{${p.sigma}^2}}\\right] \\otimes ${a}$<br/>`;
                break;
        }
    }    
    
    equationplace.innerHTML = eqns;
    
    
    // Now run mathjax
    console.log('Waiting for MathJax to load');
    try {
        MathJax.Hub.Queue(["Typeset",MathJax.Hub]);
        MathJax.Hub.Queue((function(){main(variables);}));
    } catch(e) {
        console.log('MathJax is missing, continuing without it');
        main(variables);
    }
}
