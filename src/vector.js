/**
 * Add two vectors.
 * @param {Array} a 
 * @param {Array} b 
 * @returns {Array}
 */
export function add(a, b) {
    return a.map((v, i) => v + b[i]);
}

/**
 * Subtract vector b from a.
 * @param {Array} a 
 * @param {Array} b 
 * @returns {Array}
 */
export function subtract(a, b) {
    return a.map((v, i) => v - b[i]);
}

/**
 * Multiply a vector by a scalar.
 * @param {Array} a 
 * @param {number} s 
 * @returns {Array}
 */
export function scale(a, s) {
    return a.map(v => v * s);
}

/**
 * Euclidean norm (length) of a vector.
 * @param {Array} a 
 * @returns {number}
 */
export function norm(a) {
    return Math.sqrt(a.reduce((sum, v) => sum + v*v, 0));
}

/**
 * Dot product of two vectors.
 * @param {Array} a 
 * @param {Array} b 
 * @returns {number}
 */
export function dot(a, b) {
    return a.reduce((sum, v, i) => sum + v * b[i], 0);
}

/**
 * Return a unit vector in the direction of a.
 * @param {Array} a 
 * @returns {Array}
 */
export function normalize(a) {
    let n = norm(a);
    return n === 0 ? a.map(() => 0) : scale(a, 1/n);
}

/**
 * Distance between two points.
 * @param {Array} a 
 * @param {Array} b 
 * @returns {number}
 */
export function distance(a, b) {
    return norm(subtract(a, b));
}
