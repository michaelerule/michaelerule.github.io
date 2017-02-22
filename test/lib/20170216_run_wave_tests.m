Se=0.2;Ne=0.18;Te=1;Aee=12.1;He=2.7;Be=1.7;Tve=2000;Ti=9;Aei=5.6;dt=1;

doplot= 1;
step  = 200;
n     = 128;
mu    = 0;
beta  = 1;
d     = Se;
Kee   = Aee;
Kie   = Aei;
Kre   = Be;
Ae    = 1.0/Te;
Ai    = 1.0/Ti;
Ar    = 1.0/Tve;
H     = He;
noise = Ne;

sampleREImodel(doplot,ini,steps,dt,n,mu,beta,d,Kee,Kie,Kre,Ae,Ai,Ar,H,noise)


