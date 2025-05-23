#!/usr/bin/python
# -*- coding: UTF-8 -*-
from __future__ import absolute_import
from __future__ import with_statement
from __future__ import division
from __future__ import nested_scopes
from __future__ import generators
from __future__ import unicode_literals
from __future__ import print_function

from pylab import *
import colorsys
import matplotlib.pyplot as plt
from mpl_toolkits import axes_grid1
import scipy.stats

# Configure matplotlib
matplotlib.rcParams['figure.dpi']=300
TEXTWIDTH = 5.62708
matplotlib.rcParams['figure.figsize'] = (TEXTWIDTH, TEXTWIDTH/sqrt(2))
SMALL_SIZE  = 7
MEDIUM_SIZE = 8
BIGGER_SIZE = 9
matplotlib.rc('font'  , size     =SMALL_SIZE ) # controls default text sizes
matplotlib.rc('axes'  , titlesize=MEDIUM_SIZE) # fontsize of the axes title
matplotlib.rc('axes'  , labelsize=MEDIUM_SIZE) # fontsize of the x and y labels
matplotlib.rc('xtick' , labelsize=SMALL_SIZE ) # fontsize of the tick labels
matplotlib.rc('ytick' , labelsize=SMALL_SIZE ) # fontsize of the tick labels
matplotlib.rc('legend', fontsize =SMALL_SIZE ) # legend fontsize
matplotlib.rc('figure', titlesize=BIGGER_SIZE) # fontsize of the figure title
matplotlib.rc('lines' , solid_capstyle='round')

def add_circle(radius=1,lw=0.75,color='k',linestyle='-',n=360):
    circle = exp(1j*linspace(0,2*pi,n))*radius
    plot(circle.real,circle.imag,lw=lw,color=color,linestyle=linestyle)

def label_complex_axes(color='k'):
    text(0,ylim()[1],'$\Im$',va='top',color=color)
    text(xlim()[1],0,'$\Re$',va='bottom',ha='right',color=color)
    
def add_complex_axes(lw=0.75,color='w',limits=[(-2,2),(-2,2)]):
    plot(limits[0],[0,0],lw=lw,color=color,linestyle=':')
    plot([0,0],limits[1],lw=lw,color=color,linestyle=':')
    add_circle(1,lw,color,linestyle=':')
    xlim(*limits[0])
    ylim(*limits[1])
    label_complex_axes(color)
    gca().spines['top'  ].set_visible(False)
    gca().spines['right'].set_visible(False)
    
# Colorbar Patch from here
# https://stackoverflow.com/questions/18195758/set-matplotlib-colorbar-size-to-match-graph
def add_colorbar(im, aspect=20, pad_fraction=0.5, **kwargs):
    """Add a vertical color bar to an image plot."""
    divider = axes_grid1.make_axes_locatable(im.axes)
    width = axes_grid1.axes_size.AxesY(im.axes, aspect=1./aspect)
    pad = axes_grid1.axes_size.Fraction(pad_fraction, width)
    current_ax = plt.gca()
    cax = divider.append_axes("right", size=width, pad=pad)
    plt.sca(current_ax)
    return im.axes.figure.colorbar(im, cax=cax, **kwargs)

def phase_magnitude_figure(z,limit=2):
    subplot(121)
    # The $\tan^{-1}|z|$ scaling on the magnitude is arbitrary,
    # and done only to map ${0,\infty)$ to a finite color range
    ext=(-limit,limit,-limit,limit)
    v = arctan(abs(z))/(pi/2)
    v = v*0.975+0.0125
    v = v**0.5
    im = imshow(v,extent=ext,cmap='bone')
    xlabel('$\Re$')
    ylabel('$\Im$')
    title('Magnitude')
    add_complex_axes(limits=((-limit,limit),)*2)
    subplot(122)
    im = imshow(angle(z),extent=ext,cmap='hsv',interpolation='nearest')
    xlabel('$\Re$')
    ylabel('$\Im$')
    cax = add_colorbar(im,label="Phase $\\theta$")
    cax.set_ticks([-pi*0.999,0,pi*0.999])
    cax.ax.set_yticklabels(['-π','0','π'])
    title('Phase')
    add_complex_axes(limits=((-limit,limit),)*2)
    tight_layout()

def joint_phase_magnitude_plot(z,limit=[(-2,2),(-2,2)],color='w'):
    h = ((angle(z)+pi)%(2*pi))/(2*pi)
    v = arctan(abs(z))/(pi/2)
    v = v*0.975+0.0125
    v[isnan(v)]=1
    h[isnan(h)]=0
    rgb = [colorsys.hsv_to_rgb(hi,min(1,2*(1-vi))**0.5,min(1,2*vi)**0.5) for (hi,vi) in zip(h.ravel(),v.ravel())]
    rgb = np.array(rgb).reshape((z.shape[0],z.shape[1],3))
    imshow(rgb,extent=tuple(limit[0])+tuple(limit[1]),interpolation='bicubic')
    add_complex_axes(limits=limit,color=color)
    title('Phase-magnitude plot')
    xticks([limit[0][0],0,limit[0][1]])
    yticks([limit[1][0],0,limit[1][1]])

def do_bode_z(ω,Y,ax1,ax2,stitle='',label=None,color='k',linestyle='-',lw=0.8,drawlegend=True):
    '''
    Parameters
    ----------
    ω: frequencies at which to evaluate
    w: complex-valued output of z-transfer function at each frequency
    ax1: axis for the magnitude (gain) plot
    ax2: axis for phase plot
    '''
    w = Y(exp(1j*ω))
    if label is None:
        label = stitle
    sca(ax1)
    semilogy(ω,(abs(w)),label=label,color=color,linestyle=linestyle,lw=lw)
    ylabel('Gain')
    def do_axis(ax):
        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)
        ax.get_xaxis().tick_bottom()
        ax.get_yaxis().tick_left()
        ax.autoscale(enable=True, axis='x', tight=True)
        for text in ax.get_xminorticklabels():
            text.set_rotation(90)
    do_axis(gca())
    xticks([0,pi],['',''])
    title(stitle)
    if drawlegend:
        lg = legend(loc='center left',bbox_to_anchor=(1,0.5))
        lg.get_frame().set_linewidth(0.0)
    sca(ax2)
    θ = angle(w)#%(2*pi)-2*pi
    plot(ω,θ,label=label,color=color,linestyle=linestyle,lw=lw)
    ylabel('Phase')
    do_axis(gca())
    yticks([-pi,0,pi],['-π','0','π'])
    ylim(-pi,pi)
    xticks([0,pi/2,pi],['0','π/2','π'])
    axhline(0,lw=0.5,color='k',linestyle=':')
    xlabel('Normalized frequency')

def do_nyquist(ax,z,Y,extent=8):
    ζ = Y(z)
    x,y = ζ.real,ζ.imag
    sca(ax)
    plot(x,y)
    add_complex_axes(color='k',limits = ((-extent,extent),(-extent,extent)))
    title('Nyquist plot')
    xlabel('$\Re$')
    ylabel('$\Im$')
    
def do_bode_and_nyquist(Y,extent=4):
    figure(figsize=(TEXTWIDTH,2.75))
    ax1 = subplot2grid((2,4),(0,0),rowspan=1,colspan=2)
    ax2 = subplot2grid((2,4),(1,0),rowspan=1,colspan=2)
    ax3 = subplot2grid((2,4),(0,2),rowspan=2,colspan=2)
    ω = linspace(0,pi,1000)
    do_bode_z(ω,Y,ax1,ax2,stitle='Bode plot',lw=1.5,drawlegend=False)
    z = exp(1j*linspace(0,2*pi,10000))
    do_nyquist(ax3,z,Y,extent=extent)
    subplots_adjust(left=0.125,bottom=0.15,top=0.9,right=0.975,wspace=1,hspace=0.55)
    return ax1,ax2,ax3
    
def do_bode_s(ω,w,ax1,ax2,stitle='',label=None,color='k',linestyle='-',lw=0.8):
    '''
    Parameters
    ----------
    ω : frequencies at which to evaluate
    w : complex-valued output of z-transfer function at each frequency
    ax1 : axis for the magnitude (gain) plot
    ax2 : axis for phase plot
    '''
    if label is None:
        label = stitle
    sca(ax1)
    loglog(ω,(abs(w)),label=label,color=color,linestyle=linestyle,lw=lw)
    ylabel('Gain')
    def do_axis(ax):
        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)
        ax.get_xaxis().tick_bottom()
        ax.get_yaxis().tick_left()
        ax.autoscale(enable=True, axis='x', tight=True)
    do_axis(gca())
    title(stitle)
    lg = legend(loc='center left',bbox_to_anchor=(1,0.5))
    lg.get_frame().set_linewidth(0.0)
    sca(ax2)
    semilogx(ω,angle(w)%(2*pi)-2*pi,label=label,color=color,linestyle=linestyle,lw=lw)
    ylabel('Phase')
    do_axis(gca())
    yticks([-2*pi,-pi,0],['-2π','-π','0'])
    ylim(-2*pi,0)
