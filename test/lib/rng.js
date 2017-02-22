/**
 * Pseudorandom number generation is costly. This buids an object
 * that can be re-seeded with the stronger Math.random(), but also
 * has a method "uint8" that returns a random 8 bit int using a much
 * weaker random number generator. You can intermittently re-seed
 * the weak RNG with the strong RNG to get a good trade-off in
 * randomness vs performance.
 * @returns {object} - an object with methods seed and uint8
 */
function WeakRNG() {
    var rng = {};
    var rand = Math.floor(Math.random()*0x1000000);
    rng.seed = function() {
        return rand = Math.floor(Math.random()*0x1000000);}
    rng.uint8 = function() {
        return (rand^=rand>>2^rand<<1)&0xff;}
    rng.uniform = function() {
        return ((rand^=rand>>2^rand<<1)&0xff)*0.00392156862745098;}
    return rng;
}
