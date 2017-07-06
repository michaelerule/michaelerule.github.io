import processing.core.*; 
import processing.xml.*; 

import java.util.*; 

import java.applet.*; 
import java.awt.Dimension; 
import java.awt.Frame; 
import java.awt.event.MouseEvent; 
import java.awt.event.KeyEvent; 
import java.awt.event.FocusEvent; 
import java.awt.Image; 
import java.io.*; 
import java.net.*; 
import java.text.*; 
import java.util.*; 
import java.util.zip.*; 
import java.util.regex.*; 

public class gzoom extends PApplet {



class Model {
  Collection<Edge> rules;
  Collection<Point> points;
  float mutate_rate;
  public Model(Collection<Edge> r,Collection<Point> p,float f) {
    rules=r;
    points=p;
    mutate_rate=f;
  }
}

class Point {
  float x,y,z;
  Point old;
  Point(float x,float y,float z) {
    this.x=x;
    this.y=y;
    this.z=z;
  }
  Point(Point p) {
    x=p.x;
    y=p.y;
    z=p.z;
  }
  public float rr() {
    return x*x+y*y+z*z;
  }
  public Point diff(Point p) {
    return new Point(x-p.x,y-p.y,z-p.z);
  }
  public Point plus(Point p) {
    return new Point(x+p.x,y+p.y,z+p.z);
  }
  public Point rotatez(float t) {
    float c=cos(t),s=sin(t);
    return new Point(x*c-y*s,x*s+y*c,z);
  }
  public Point scale(float s) {
    return new Point(x*s,y*s,z*s);
  }
  public void scaleeq(float s) {
    x*=s;
    y*=s;
    z*=s;
  }
  public void diffeq(float s) {
    x-=s;
    y-=s;
    z-=s;
  }
  public void diffeq(Point s) {
    x-=s.x;
    y-=s.y;
    z-=s.z;
  }
  public void pluseq(float s) {
    x+=s;
    y+=s;
    z+=s;
  }
  public void pluseq(Point s) {
    x+=s.x;
    y+=s.y;
    z+=s.z;
  }
  public float dot(Point p) {
    return x*p.x+y*p.y+z*p.z;
  }
  public void project(Point X,Point Y) {
    x=dot(X)/X.rr();
    y=dot(Y)/Y.rr();
  }
  public void remember() {
    if (old==null) old=new Point(this);
    else {
      old.x=x; 
      old.y=y; 
      old.z=z;
    } 
  }
}

class Edge implements Comparable {
  Point a,b;
  boolean future;
  Model model=null;
  Edge(Point a,Point b) {
    this(a,b,true);
  }
  Edge(Point a,Point b,boolean future) {
    this(a,b,future,null);
  }
  Edge(Point a,Point b,boolean future,Model model) {
    this.a=a; 
    this.b=b; 
    this.future=future; 
    this.model=model;
  }
  public float lensq() {
    return a.diff(b).rr();
  }
  public Edge rotatez(float t) {
    return new Edge(a,a.plus(b.diff(a).rotatez(t)));
  }
  public int compareTo(Object o) {
    Edge e=(Edge)o;
    if (e==this) return 0;
    float l1=e.lensq(),l2=lensq();
    if (l1<l2) return -1; 
    if (l2>l1) return 1;
    return e.toString().compareTo(toString());
  }
}

int W=640,H=480;
//int W=screen.width,H=screen.height;
Point assymetry = new Point(1,1,1);
Point sum_decay = new Point(0,0,0);
float decay = 0.05f;
float rate = 1.01f;
float refine = 9;
float radius = W;
float crop = H*H;
float scrub = 0;
int maxsize = 10000;
int templaten=0;
float p_mutate=0.2f;
Set<Edge> edges = new HashSet<Edge>();
Edge [][] template = new Edge[][] {
  new Edge[] {
    new Edge(new Point(0,0,0),new Point(0.25f,0,0)),
    new Edge(new Point(0.75f,0,0),new Point(1,0,0)),
    new Edge(new Point(0.25f,0,0),new Point(0.25f+0.25f*cos(PI/3),0.25f*sin(PI/3),0)),
    new Edge(new Point(0.25f,0,0),new Point(0.25f+0.25f*cos(PI/3),-0.25f*sin(PI/3),0)),
    new Edge(new Point(0.25f+0.25f*cos(PI/3),0.25f*sin(PI/3),0),new Point(0.5f+0.25f*cos(PI/3),0.25f*sin(PI/3),0)),
    new Edge(new Point(0.25f+0.25f*cos(PI/3),-0.25f*sin(PI/3),0),new Point(0.5f+0.25f*cos(PI/3),-0.25f*sin(PI/3),0)),
    new Edge(new Point(0.5f+0.25f*cos(PI/3),0.25f*sin(PI/3),0),new Point(0.75f,0,0)),
    new Edge(new Point(0.5f+0.25f*cos(PI/3),-0.25f*sin(PI/3),0),new Point(0.75f,0,0))
    }
    ,
  new Edge[] {
    new Edge(new Point(0,0,0),new Point(0.25f,0,0)),
    new Edge(new Point(0.75f,0,0),new Point(1,0,0)),
    new Edge(new Point(0.25f,0,0),new Point(0.25f+0.25f*cos(PI/3),0.25f*sin(PI/3),0)),
    new Edge(new Point(0.25f+0.25f*cos(PI/3),0.25f*sin(PI/3),0),new Point(0.5f+0.25f*cos(PI/3),0.25f*sin(PI/3),0)),
    new Edge(new Point(0.5f+0.25f*cos(PI/3),0.25f*sin(PI/3),0),new Point(0.75f,0,0)),
  }
  ,
  new Edge[] {
    new Edge(new Point(0,0,0),new Point(1,0,0),false),
    new Edge(new Point(1,0,0),new Point(1.5f,.5f,0)),
    new Edge(new Point(1,0,0),new Point(1.5f,-.5f,0))
    }
    ,
  new Edge[] {
    new Edge(new Point(0,0,0),new Point(0.5f,.5f,0)),
    new Edge(new Point(0.5f,0.5f,0),new Point(1,0,0))
    }
    ,
    new Edge[] {
    new Edge(new Point(0,0,0),new Point(1.f/2*cos(PI/3),1.f/2*sin(PI/3),0)),
    new Edge(new Point(1.f/2*cos(PI/3),-1.f/2*sin(PI/3),0),new Point(0,0,0)),
    new Edge(new Point(1.f/2*cos(PI/3),1.f/2*sin(PI/3),0),new Point(1.f/2+1.f/2*cos(PI/3),1.f/2*sin(PI/3),0)),
    new Edge(new Point(1.f/2+1.f/2*cos(PI/3),-1.f/2*sin(PI/3),0),new Point(1.f/2*cos(PI/3),-1.f/2*sin(PI/3),0)),
    new Edge(new Point(1.f/2+1.f/2*cos(PI/3),1.f/2*sin(PI/3),0),new Point(1,0,0)),
    new Edge(new Point(1,0,0),new Point(1.f/2+1.f/2*cos(PI/3),-1.f/2*sin(PI/3),0))
    }
    ,
    new Edge[] {
    new Edge(new Point(0,0,0),new Point(1.f/3*cos(PI/3),1.f/3*sin(PI/3),0)),
    new Edge(new Point(1.f/3*cos(PI/3),-1.f/3*sin(PI/3),0),new Point(0,0,0)),
    new Edge(new Point(1.f/3*cos(PI/3),1.f/3*sin(PI/3),0),new Point(1.f/3+1.f/3*cos(PI/3),1.f/3*sin(PI/3),0)),
    new Edge(new Point(1.f/3+1.f/3*cos(PI/3),-1.f/3*sin(PI/3),0),new Point(1.f/3*cos(PI/3),-1.f/3*sin(PI/3),0)),
    new Edge(new Point(1.f/3+1.f/3*cos(PI/3),1.f/3*sin(PI/3),0),new Point(1,0,0)),
    new Edge(new Point(1,0,0),new Point(1.f/3+1.f/3*cos(PI/3),-1.f/3*sin(PI/3),0))
    }
    ,
  new Edge[] {
    new Edge(new Point(0,0,0),new Point(0.5f,.5f,0)),
    new Edge(new Point(0.5f,0.5f,0),new Point(1,0,0)),
    new Edge(new Point(0.5f,-.5f,0),new Point(0,0,0)),
    new Edge(new Point(1,0,0),new Point(0.5f,-0.5f,0))
    }
    ,
  new Edge[] {
    new Edge(
    new Point(random(-1,1),random(-1,1),0),
    new Point(random(-1,1),random(-1,1),0)),new Edge(
    new Point(random(-1,1),random(-1,1),0),
    new Point(random(-1,1),random(-1,1),0))
    }
    ,
  new Edge[] {
    new Edge(
    new Point(random(-1,1),random(-1,1),0),
    new Point(random(-1,1),random(-1,1),0)),new Edge(
    new Point(random(-1,1),random(-1,1),0),
    new Point(random(-1,1),random(-1,1),0)),new Edge(
    new Point(random(-1,1),random(-1,1),0),
    new Point(random(-1,1),random(-1,1),0))
    }
    ,
  new Edge[] {
    new Edge(
    new Point(random(-1,1),random(-1,1),0),
    new Point(random(-1,1),random(-1,1),0)),new Edge(
    new Point(random(-1,1),random(-1,1),0),
    new Point(random(-1,1),random(-1,1),0)),new Edge(
    new Point(random(-1,1),random(-1,1),0),
    new Point(random(-1,1),random(-1,1),0)),new Edge(
    new Point(random(-1,1),random(-1,1),0),
    new Point(random(-1,1),random(-1,1),0))
    }
  };

  public void zoom(float factor) {
    for (Edge e : edges) {
    e.a.x*=factor;
    e.a.y*=factor;
    e.a.z*=factor;
    e.b.x*=factor;
    e.b.y*=factor;
    e.b.z*=factor;
  }
}

public void clean(float rr,float ss,float p) {
  Set<Edge> delete = new HashSet<Edge>();
  for (Edge e : edges) if (e.a.plus(assymetry).rr()>rr || e.b.plus(assymetry).rr()>rr || e.lensq()<ss || random(0,1)<p) delete.add(e);
  edges.removeAll(delete);
}

Model T=random_model();
public void generate(Edge E,Set<Edge> store) {
  //Model T=E.model;
  //if (T==null) T=random_model();
  //else if (random(0,1)<p_mutate) T=mutate_model(T);
  Point X=E.b.diff(E.a);
  Point Y=X.rotatez(PI*0.5f);
  for (Edge e:T.rules)
    store.add(new Edge(X.scale(e.a.x).plus(Y.scale(e.a.y)).plus(E.a),X.scale(e.b.x).plus(Y.scale(e.b.y)).plus(E.a),e.future,T));
}

public void elaborate(float rr) {
  Set<Edge> delete = new HashSet<Edge>();
  Set<Edge> create = new HashSet<Edge>();
  for (Edge e : edges) if (e.future && e.lensq()>rr) 
  {
    delete.add(e);
    generate(e,create);
    if (edges.size()+create.size()-delete.size()>maxsize) break;
  }
  edges.removeAll(delete);
  edges.addAll(create);
}

public Point getCenter() {
  Point sum=new Point(0,0,0);
  for (Edge e: edges){
    sum.pluseq(e.a);
    sum.pluseq(e.b);}
  sum.scaleeq(0.5f/edges.size());
  return sum;
} 

public float enforce() {
  float sum=0;
  for (Edge e: edges) sum+=e.lensq();
  return sqrt(sum/edges.size());
}  

public float getVar(Point center) {
  float sum=0;
  for (Edge e: edges){
    sum+=e.a.diff(center).rr();
    sum+=e.b.diff(center).rr();}
  return sum*0.5f/edges.size();
} 

public void center(Point P) {
  for (Edge e: edges){
    e.a.diffeq(P);
    e.b.diffeq(P);}
}

public Model align(Model mod){
  List<Point> P = new ArrayList<Point>(mod.points);
  if (P.size()<2) return mod;
  Point a = P.get((int)random(P.size())),b=a;
  while (b==a) b=P.get((int)random(P.size()));
  Point x=b.diff(a);
  Point y=x.rotatez(-PI*0.5f);
  for (Point p:mod.points) { p.diffeq(a); p.project(x,y); }
  return mod;
} 

public Model random_model() {
  float span=1;
  int N=(int)random(10)+1;
  int M=(int)random(N*(N-1)/2-1)+1;
  Point[] p = new Point[N];
  Edge[] r = new Edge[M];
  for (int i=0;i<N;i++) p[i]=new Point(random(-span,span),random(-span,span),0);
  for (int i=0;i<M;i++) r[i]=new Edge(p[(int)random(0,N)],p[(int)random(0,N)]);
  Set<Edge>  e = new HashSet<Edge> (Arrays.asList(r));
  Set<Point> f = new HashSet<Point>(Arrays.asList(p));
  //return align(new Model(e,f,random(0.001,1)));
  return new Model(e,f,random(0.001f,1));
}

public Point rand_point(float span) {
  return new Point(random(-span,span),random(-span,span),0);
} 

public Model mutate_model(Model mod) {
  int N=mod.rules.size();
  int M=mod.points.size();
  List<Point> p = new ArrayList<Point>(mod.points);
  List<Edge>  e = new ArrayList<Edge> (mod.rules );
  List<Point> q = new ArrayList<Point>();
  List<Edge>  f = new ArrayList<Edge> ();
  for (Point P:p) q.add(new Point(P));
  for (Edge  E:e) f.add(new Edge(q.get(p.indexOf(E.a)),q.get(p.indexOf(E.b))));
  
  return new Model(f,q,mod.mutate_rate);
  //return random_model();
}

public void keyPressed() {
  //if (key==LEFT||key=='a')  {templaten=(templaten-1+template.length)%template.length;T=template[templaten];}
  //if (key==RIGHT||key=='s') {templaten=(templaten+1)%template.length;T=template[templaten];}
  //print(templaten);
  if (key=='d') T=random_model();
}

public void remember() {
  for (Edge e  : edges) {
    e.a.remember();
    e.b.remember();
  }
}

public void setup() {
  size(640, 480, P2D);
  //size(W,H,P2D);
  frameRate(24);
  Model mod = new Model(new HashSet<Edge>(Arrays.asList(template[2])),new HashSet<Point>(),1);
  T=mod;
  edges.add(new Edge(new Point(-100,0,0),new Point(100,0,0),true,mod));
  //edges.add(new Edge(new Point(-100,0,0),new Point(100,0,0),true,random_model()));
}

int alpha=50;

public void draw() {
  //background(50,0,50);
  fill(50,0,50,alpha);
  stroke(50,0,50,alpha);
  quad(0,0,0,H,W,H,W,0);
  translate(width/2, height/2);
  stroke(255,255,0,alpha);
  //for (Edge e : edges) line(e.a.x,e.a.y,e.b.x,e.b.y);
  //for (Edge e : edges) point(e.a.x,e.a.y);//,e.b.x,e.b.y,e.b.z);
  for (Edge e : edges) if (e.a.old!=null) {
    line(e.a.x,e.a.y,e.a.old.x,e.a.old.y);
    line(e.a.x,e.a.y,e.b.x,e.b.y);
  }
  remember();
  Point C=getCenter(); 
  center(C.scale(decay));
  //float ss=getVar(C);
  //println(ss);
  //ss=sqrt(sqrt(ss));
  //println(ss);
  //zoom(1/ss);
  zoom(rate);
  //zoom(10/enforce()*decay+(1-decay));
  clean(crop,scrub,0.0f);
  elaborate(refine);
  if (edges.size()<5) {
    edges.add(new Edge(
    new Point(random(-radius,radius),random(-radius,radius),0),
    new Point(random(-radius,radius),random(-radius,radius),0)));
    //T=random_model();
  }
  //if (random(0,1)<0.001) T=random_model();
}

  static public void main(String args[]) {
    PApplet.main(new String[] { "--present", "--bgcolor=#666666", "--stop-color=#cccccc", "gzoom" });
  }
}
