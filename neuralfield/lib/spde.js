function htmlentities(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/(?:\r\n|\r|\n)/g,'<br/>');
}


function main(variables) {

    // set up axis titles and labels for the four subplots
    for (var _i_=1; _i_<=4; _i_++) {
        eval(`document.getElementById('subplot${_i_}title' ).innerHTML = panel${_i_}.title  || ''`);
        eval(`document.getElementById('subplot${_i_}xlabel').innerHTML = panel${_i_}.xlabel || ''`);
        eval(`document.getElementById('subplot${_i_}ylabel').innerHTML = panel${_i_}.ylabel || ''`);
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
    var downscale  = 1;
    _WIDTH     = canvas.clientWidth >>downscale;
    _HEIGHT    = canvas.clientHeight>>downscale;
    _WIDTH2    = _WIDTH*2|0;
    _HEIGHT2   = _HEIGHT*2|0;
    _NGRID     = _WIDTH*_HEIGHT|0;
    _middle    = _WIDTH/2|0;
    _dY        = _HEIGHT*2*_WIDTH;
    _M         = 4*_WIDTH*_HEIGHT;

    // constants for drawing phase-plane subplots
    plot_padding = 72>>downscale;
    _mg          = plot_padding/2|0; // plot margin
    _SW          = _WIDTH-plot_padding|0;   // plot width

    // radius of circular stimulus mask and smoothness (pixels)
    var mask_radius     = 20;
    var structure_scale = 3;

    // Get a 2D rendering context, and bind an image buffer to it
    canvas.width  = _WIDTH2;
    canvas.height = _HEIGHT2;
    var ctx       = canvas.getContext('2d');
    var imageData = ctx.getImageData(0,0,_WIDTH*2,_HEIGHT*2);
    var data      = new Uint32Array(imageData.data.buffer);
    ctx.putImageData(imageData, 0, 0);

    // Get a (very poor! very fast.) random number generator
    __RNG__ = WeakRNG();

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
    
    // step function
    function heav(z) { return z<0.0? 0.0 : z==0.0? 0.5 : 1.0; }
    // firing nonlinearity
    function __f(_x_) { return 1/(1+Math.exp(-_x_)); }
    // Make a lookup table for firing rate nonlinearity
    // since exponentiation is too slow
    var nonlinearity_lookup = new Float32Array(new ArrayBuffer(4096*4));
    for (var _i_=0; _i_<4096; _i_++) {
        var _x_ = (_i_-2048)/256.0;
        nonlinearity_lookup[_i_]=__f(_x_);
    }
    function f(_x_) {
        var _i_ = (_x_*256|0)+2048;
        if (_i_<0) return 0.0;
        if (_i_>=4096) return 1.0;
        return nonlinearity_lookup[_i_]
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
            field,operator,temp,_WIDTH,_HEIGHT,sigma,sigma);
    }
    
    function LAPL(field,operator) {
        periodicLaplacian(field,operator,_WIDTH,_HEIGHT);
    }

    // TODO LAPLACE AND GRADIENT OPERATORS
    //function LAPLACE(field) {
    //}
    
    // Dynamically allocate simulation memory buffers
    // Each field and linear operator is given a buffer
    // We also need some temporary buffers to store intermediates
    // and some buffers to hold cached phase plane data
    // hard-coding buffers for the phase planes for now
    var simbuffer = function() {
        return new Float32Array(new ArrayBuffer(_NGRID*4))
    };
    buffers = ['temp','mask','pp3dx','pp4dx','pp3dy','pp4dy'];
    for (var _i_=0;_i_<fields.length   ;_i_++) 
        buffers.push(['__'+fields[_i_].name]);
    for (var _i_=0;_i_<operators.length;_i_++) 
        buffers.push(['__'+operators[_i_].name]);
    create_buffers = '';
    for(var _i_=0; _i_<buffers.length; _i_++)
        create_buffers += 'var '+buffers[_i_]+'=simbuffer();\n';
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
    for (var _i_=0;_i_<fields.length;_i_++)
        loadb+='var '+fields[_i_].name+'=__'+fields[_i_].name+'[_i_];\n';
    for (var _i_=0;_i_<operators.length;_i_++) 
        loadb+='var '+operators[_i_].name+'=__'+operators[_i_].name+'[_i_];\n';
    
    // We gain some speed improvement if we substiute parameters as
    // numeric constants and force the JIT to recompile our kernel
    // every time they change. The main kernel template stays the
    // same though, so we generate it once at the beginning.
    kernel_source = 'function kernel(t) {\n';
    // precompute linear operators
    for (var _i_=0;_i_<operators.length;_i_++) {
        var t  = operators[_i_].type;
        var of = operators[_i_].applyto;
        var n  = operators[_i_].name;
        var p  = operators[_i_].params;
        switch (t) {
            case 'GCONV':
                kernel_source += `${t}(__${of},__${n},${p.sigma});\n`;
                break;
            case 'LAPL':
                kernel_source += `${t}(__${of},__${n});\n`;
                break;
        }
    }
    

    // Variation for semi-implicit Euler (will it work?)
    // Loop header
    kernel_source+=`for (var _y_=0;_y_<_HEIGHT;_y_++) {
        var _Y_=_y_*_WIDTH;
        for (var _x_=0;_x_<_WIDTH;_x_++) {
        var _i_=_x_+_Y_;
        var s = mask[_i_]*amp;`;
    // load fields and operators into local vairables
    kernel_source += loadb;
    // Compute auxiliary variables
    for (var _i_=0;_i_<auxvars.length;_i_++) 
        kernel_source += 'var '+auxvars[_i_].name+'='+auxvars[_i_].update+';\n';    


    // Apply update equations (compute field derivatives)
    for (var _i_=0;_i_<fields.length;_i_++) {
        var _x_ = fields[_i_].name;
        // Compute derivative 
        kernel_source += 'var __d__'+_x_+'='+fields[_i_].update+';\n';
        // Compute new version (should overwrite variable name)
        kernel_source += _x_+'='+_x_+'+__d__'+_x_+'*dt;\n';
        // NaN control
        kernel_source += 'if (isNaN('+_x_+')) '+_x_+'=0;\n';
        // Enforce bounds
        kernel_source += '__'+_x_+'[_i_]=min(1,max(-1,'+_x_+'));\n';
    }

    /*
    // Variation for forward Euler
    // Loop header
    kernel_source+=`for (var _y_=0;_y_<_HEIGHT;_y_++) {
        var _Y_=_y_*_WIDTH;
        for (var _x_=0;_x_<_WIDTH;_x_++) {
        var _i_=_x_+_Y_;
        var s = mask[_i_]*amp;`;
    // load fields and operators into local vairables
    kernel_source += loadb;
    // Compute auxiliary variables
    for (var _i_=0;_i_<auxvars.length;_i_++) 
        kernel_source += 'var '+auxvars[_i_].name+'='+auxvars[_i_].update+';\n';    
    // Apply update equations (compute field derivatives)
    for (var _i_=0;_i_<fields.length;_i_++) 
        kernel_source += 'var __d__'+fields[_i_].name+'='+fields[_i_].update+';\n';
    // Euler integrate
    for (var _i_=0;_i_<fields.length;_i_++) {
        var _x_ = fields[_i_].name;
        kernel_source += '_n_'+_x_+'='+_x_+'+__d__'+_x_+'*dt;\n';
        kernel_source += 'if (isNaN(_n_'+_x_+')) _n_'+_x_+'=0;\n';
    }
    // HACK REMOVE THIS!
    //kernel_source += '_rr_=_n_x*_n_x+_n_y*_n_y; if (_rr_>1) {_scale_ = 1.0/max(1e-10,sqrt(_rr_)); _n_x*=_scale_; _n_y*=_scale_;}'
    // save state (hard limits?)
    for (var _i_=0;_i_<fields.length;_i_++) {
        var _x_ = fields[_i_].name;
        kernel_source += '__'+_x_+'[_i_]=min(1,max(-1,_n_'+_x_+'));\n';
    }
    // save state
    //for (var _i_=0;_i_<fields.length;_i_++) {
    //    var _x_ = fields[_i_].name;
    //    kernel_source += '__'+_x_+'[_i_]='+_x_+'+__d__'+_x_+'*dt;\n';
    //}
    */

    // footer
    kernel_source += '}}}';
    // Convert free variables to template entries
    // There is a problem wherein this is matching partial
    for (var varname in variables) if (variables.hasOwnProperty(varname)) {
        var re = new RegExp('(?=^|[^a-zA-Z0-9_])'+varname+'(?=[^a-zA-Z0-9_]|$)','g')
        //var re = new RegExp(varname,'g')
        kernel_source = kernel_source.replace(re,'${'+varname+'}');
    }
    kernel_source = kernel_source.replace(new RegExp('RANDN', 'g'),'(((__RNG__.uniform()-0.5)*3.4641)/sqrt(dt))');
    console.log(kernel_source);


    // Dynamically generate functions for finding the phase-plane
    // nullclines. User-specified equations are used to allow
    // the user to perform adiabatic elimination, ignore taus, etc
    // for now _x_ and _y_ ranges are clipped to [0,1]
    function zero_finder(panel) {

        var due = panel.dx;
        var dui = panel.dy;
        var _x_ = panel.x;
        var _y_ = panel.y;

        var _xscale = (panel.xlim[1]-panel.xlim[0])/_SW;
        var _yscale = (panel.ylim[1]-panel.ylim[0])/_SW;
        var _xmin   = panel.xlim[0];
        var _ymin   = panel.ylim[0];

        template = `
        function find_zeros(buffer1,buffer2) {
            var minx=-1, miny=-1, best=1e30;
            for (var _y_=0; _y_<${_SW}; _y_++) {
                var ${_y_} = _y_*${_yscale}+${_ymin};
                for (var _x_=0; _x_<${_SW}; _x_++) {
                    var ${_x_} = _x_*${_xscale}+${_xmin};
                    var due = ${due};
                    var dui = ${dui};
                    var mag = due*due+dui*dui;
                    if (mag<best) {best=mag; minx=${_x_}; miny=${_y_};}
                    var _i_ = _x_+${_SW}*_y_;
                    buffer1[_i_]=due; buffer2[_i_]=dui;
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

    // Function for tracing nullclines given an array of _x_ and _y_
    // derivatives
    function trace_nullclines(_dx_,_dy_,_origin_) {
            for (var _y_=1; _y_<_SW; _y_++) {
            for (var _x_=1; _x_<_SW; _x_++) {
                var _i_ = _x_+_SW*_y_;
                var xnull = (_dx_[_i_]>0)!=(_dx_[_i_-1]>0)||
                            (_dx_[_i_]>0)!=(_dx_[_i_-_SW]>0);
                var ynull = (_dy_[_i_]>0)!=(_dy_[_i_-1]>0)||
                            (_dy_[_i_]>0)!=(_dy_[_i_-_SW]>0);

                var color = 0x0|0;

                if (xnull)
                    color=0xff8800;
                else if (ynull)
                    color=0x0000ff;
                else {
                    if (_dx_[_i_]>0)
                       color=0x8f4400;
                    else
                       color=0x4f2200;

                    if (_dy_[_i_]>0)
                       color|=0x00008f;//((color&0xfefefe)>>1)+((0x00008f&0xfefefe)>>1);
                    else
                       color|=0x00004f;//=((color&0xfefefe)>>1)+((0x00004f&0xfefefe)>>1);
                }
                
                data[_x_+(_SW-_y_)*_WIDTH2+_origin_] = color | 0xff000000;
            }
        }
    };

    locate_zeros_panel3 = zero_finder(panel3);
    locate_zeros_panel4 = zero_finder(panel4);

    function render_scatter(field__x_,field__y_,_dx_,_dy_,_xmin,_xscale,_ymin,_yscale,_origin_,pskip) {
        // erase this subplot WxH starting at _origin_
        for (var _y_=0;_y_<_WIDTH;_y_++) {
            var _Y_ = _y_*_WIDTH2+_origin_;
            for (var _x_=0;_x_<_WIDTH;_x_++) data[_x_+_Y_]=0x00000000;
        }
        // Draw phase plane
        trace_nullclines(_dx_,_dy_,_origin_);
        //render distribution of E/I positions in phase space
        pskip = pskip || 4;
        var offset = plot_padding*(_WIDTH+1)+_HEIGHT*_WIDTH2;
        for (var _y_=1; _y_<_HEIGHT; _y_+=pskip) {
            for (var _x_=1; _x_<_WIDTH; _x_+=pskip) {
                var _i_ = _x_+_y_*_WIDTH;
                var a = (field__x_[_i_]-_xmin)*_xscale*_SW|0;
                var b = (1.-(field__y_[_i_]-_ymin)*_yscale)*_SW|0;
                var j = a+b*_WIDTH2+_origin_;
                data[j] = 0xffffffff;//0x01010101*(255-((255-((data[j])&0xff))*0.5|0));
            }
        }
    }

    function field_image_template(_origin_,R,G,B) {
        var template = `
        for (var _y_=0;_y_<_WIDTH;_y_++) {
            var _Y_ = _y_*_WIDTH2;
            for (var _x_=0;_x_<_WIDTH;_x_++) {
                var _i_ = _x_+_y_*_WIDTH;
                ${loadb};
                data[_x_+_Y_+${_origin_}] 
                    = (${B}*255|0)*0x010000 + (${G}*255|0)*0x000100
                    + (${R}*255|0)*0x000001 + 0xff000000;
        }}`;
        return template;
    }
    
    var subplot1_template = field_image_template(0,panel1.R,panel1.G,panel1.B);
    var subplot2_template = field_image_template(_WIDTH,panel2.R,panel2.G,panel2.B);
    var subplot3_template = `  
        render_scatter(__${panel3.x},__${panel3.y},pp3dx,pp3dy,
            panel3.xlim[0],1.0/(panel3.xlim[1]-panel3.xlim[0]),
            panel3.ylim[0],1.0/(panel3.ylim[1]-panel3.ylim[0]),
            ${_mg+_WIDTH2*_mg+_WIDTH2*_HEIGHT});`;
    var subplot4_template = `
        render_scatter(__${panel4.x},__${panel4.y},pp4dx,pp4dy,
            panel4.xlim[0],1.0/(panel4.xlim[1]-panel4.xlim[0]),
            panel4.ylim[0],1.0/(panel4.ylim[1]-panel4.ylim[0]),
            ${_mg+_WIDTH2*_mg+_WIDTH2*_HEIGHT+_WIDTH});`;
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
            for (var _y_=0;_y_<_HEIGHT;++_y_) {
                __RNG__.seed();
                for (var _x_=0;_x_<_WIDTH;++_x_)
                   __${fields[j].name}[_x_+_WIDTH*_y_] = __RNG__.uniform();
            }`);
        }
        showSim();
    }

    function phaserandomize() {
        for (var j=0;j<fields.length;j++) {
            eval(`
            for (var _y_=0;_y_<_HEIGHT;++_y_) {
                __RNG__.seed();
                for (var _x_=0;_x_<_WIDTH;++_x_)
                   __${fields[j].name}[_x_+_WIDTH*_y_] = (__RNG__.uniform()-.5)*.1;
            }`);
        }
        showSim();
    }

    function zeros() {
        for (var j=0;j<fields.length;j++) {
            eval(`
            for (var _y_=0;_y_<_HEIGHT;++_y_) {
                __RNG__.seed();
                for (var _x_=0;_x_<_WIDTH;++_x_)
                   __${fields[j].name}[_x_+_WIDTH*_y_] = 0.;
            }`);
        }
        showSim();
    }

    // These initialization functions assume a particular model
    // They cannot be dynamically generated
    // In the future definition of these initial conditions must
    // be incorporated into the model description
    // These we can cheat with
    eval(`var perturb__x_ = __${panel3.x};`);
    eval(`var perturb__y_ = __${panel3.y};`);
    
    function perturbhomogeneous() {
        var p = locate_zeros_panel3(pp3dx,pp3dy);
        var ue = p.x;///(1.0*_SW*(panel3.xlim[1]-panel3.xlim[0]))+panel3.xlim[0];
        var ui = p.y;///(1.0*_SW*(panel3.ylim[1]-panel3.ylim[0]))+panel3.ylim[0];
        for (var _y_=0;_y_<_HEIGHT;++_y_)
        for (var _x_=0;_x_<_WIDTH;++_x_) {
            var _i_ = _x_+_WIDTH*_y_;
            var r = 0.1*__RNG__.uniform()
            var t = 6.2831853*__RNG__.uniform()
            perturb__x_[_i_] = ue+r*Math.cos(t);
            perturb__y_[_i_] = ui+r*Math.sin(t);
        }
        showSim();
    }
    function ecellimpulse() {
        for (var _y_=0;_y_<_HEIGHT;++_y_)
        for (var _x_=0;_x_<_WIDTH;++_x_) {
            var _i_ = _x_+_WIDTH*_y_;
            perturb__x_[_i_] += .1
        }
        showSim();
    }
    function stimulate() {
        zeros();
        var RR = _middle*_middle/128;
        for (var _y_=0;_y_<_HEIGHT;++_y_) {
        var _Y_ = _y_-_middle;
        _Y_ *= _Y_;
        for (var _x_=0;_x_<_WIDTH;++_x_) {
            var X = _x_-_middle;
            X*=X;
            if (X+_Y_<RR) {
                perturb__y_[_x_+_WIDTH*_y_] = 1;
                perturb__x_[_x_+_WIDTH*_y_] = 0;
            } else {
                perturb__y_[_x_+_WIDTH*_y_] = 0;
                perturb__x_[_x_+_WIDTH*_y_] = 1;
            }
        }
        }
        showSim();
        console.log('stim');
    }
    function icellimpulse() {
        for (var _y_=0;_y_<_HEIGHT;++_y_)
        for (var _x_=0;_x_<_WIDTH;++_x_) {
            var _i_ = _x_+_WIDTH*_y_;
            perturb__y_[_i_] += .1
        }
        showSim();
    }
    function nothing() {}


    randomize();


    document.normalize();
    console.log(document.readyState);
    /*
    Prepare the user interface controls.
    All input fields have been given names that match local variable
    names. Rather than register an input-changed callback, currently we
    just poll input fields before each simulation update. First, we
    set the values of all input fields to match the initial state of these
    local control variables.
    */
    inputs = document.getElementsByTagName("input");
    controls = [];
    for (var _i_=0; _i_<inputs.length; _i_++)
        if (inputs[_i_].type=='number') {
            console.log('Found control '+inputs[_i_].name);
            controls.push(inputs[_i_]);
        }
    function setcontrols() {
        for (var _i_=0; _i_<controls.length; _i_++)
            eval('controls[_i_].value='+controls[_i_].name);
    }
    function getcontrols(){
        for (var _i_=0; _i_<controls.length; _i_++) {
            try {
                eval(controls[_i_].name+'='+controls[_i_].value);
            } catch (err) {
                console.log('Error reading parameter field');
                console.log(controls[_i_]);
                console.log(err.message);
            }
        }
    }
    setcontrols();
    var buttons = [];
    var stopstartbutton; //needs to get modified so we need a handle to it
    for (var _i_=0; _i_<inputs.length; _i_++) {
        var button = inputs[_i_];
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
        for (var _i_=0; _i_<controls.length; _i_++) {
            var control = controls[_i_];
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
    for (var _i_=0; _i_<presets.length; _i_++) {
        var name = presets[_i_][0];
        var init = eval(presets[_i_][1]);
        var pdat = presets[_i_][2];
        var ps = document.createElement("div");
        ps.setAttribute("class","squarebutton");
        ps.innerHTML = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzαβγδεζηθικλμνξοπρστυφχψω'[_i_];
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
    for (var _y_=0;_y_<_HEIGHT;_y_++) {
        var _Y_=_y_*_WIDTH;
        var _dy_=_y_-_middle;
        for (var _x_=0;_x_<_WIDTH;_x_++) {
            var _i_=_x_+_Y_;
            var _dx_ = _x_-_middle;
            if (_dx_*_dx_+_dy_*_dy_<mask_radius*mask_radius) mask[_i_]=1;
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
    for (var _i_=0; _i_<controls.length; _i_++)
        controls[_i_].addEventListener('input',compile_kernel);
    compile_kernel();

    var timestep = 0;
    var frametime = +new Date(); // unary + is an integer cast here
    var framedelayms = 25;
    var nextframe = frametime+framedelayms;
    var frameskip = 1;
    function iterate() {
        __RNG__.seed();
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
    for (var _i_=0; _i_<controls.length; _i_++) {
        variables = merge_options(variables,interpret_abbreviated_controls(controls[_i_]));
    }
    var buttons = interpret_abbreviated_controls(document.getElementById('buttongroups'));

    // Put equations in place?
    var equationplace = document.getElementById("equation");
    var eqns = '';
    for (var _i_=0;_i_<fields.length;_i_++) {
        var _x_ = fields[_i_].name;
        var u = fields[_i_].update;
        u = latex(u);
        u=u.replace(new RegExp('RANDN','g'),'\\eta ');
        u=u.replace(new RegExp('[*]','g'),'\\cdot ');
        eqns+=`$\\frac{\\partial ${_x_}}{\\partial t} = ${u}$<br/>`;
    }
    for (var _i_=0;_i_<operators.length;_i_++) {
        var o = operators[_i_];
        var n = o.name;
        var t = o.type;
        var a = o.applyto;
        var p = o.params;
        switch (t) {
            case 'GCONV':
                eqns+=`$${n}(x,y,t)=\\frac{1}{2\\pi \\cdot ${p.sigma}}\\exp\\left[{\\frac{x^2+y^2}{${p.sigma}^2}}\\right] \\star ${a}$<br/>`;
                break;
            case 'LAPL':
                eqns+=`$${n}(x,y,t)=\\nabla^2 ${a}$<br/>`;
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
