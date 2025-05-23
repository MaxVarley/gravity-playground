// src/Collision.js

import { Body } from './body.js';

/**
 * Check if two bodies are colliding (overlapping).
 * @param {Body} bodyA 
 * @param {Body} bodyB 
 * @returns {boolean}
 */
export function areColliding(bodyA, bodyB) {
    let dx = bodyA.position[0] - bodyB.position[0];
    let dy = bodyA.position[1] - bodyB.position[1];
    let distSq = dx * dx + dy * dy;
    let minDist = bodyA.radius + bodyB.radius;
    return distSq <= minDist * minDist;
}

/**
 * Merge two bodies into a new Body, conserving mass and momentum.
 * @param {Body} bodyA 
 * @param {Body} bodyB 
 * @returns {Body} new merged Body
 */
export function mergeBodies(bodyA, bodyB) {
    // Combined mass
    let totalMass = bodyA.mass + bodyB.mass;

    // Center of mass position (mass-weighted average)
    let newPos = [
        (bodyA.position[0] * bodyA.mass + bodyB.position[0] * bodyB.mass) / totalMass,
        (bodyA.position[1] * bodyA.mass + bodyB.position[1] * bodyB.mass) / totalMass,
    ];

    // Momentum conservation for velocity
    let newVel = [
        (bodyA.velocity[0] * bodyA.mass + bodyB.velocity[0] * bodyB.mass) / totalMass,
        (bodyA.velocity[1] * bodyA.mass + bodyB.velocity[1] * bodyB.mass) / totalMass,
    ];

    // Assuming constant density, area proportional to mass (for 2D: r^2 ∝ m)
    let newRadius = Math.sqrt(bodyA.radius ** 2 + bodyB.radius ** 2);

    // Pick colour: choose the more massive, or blend (here, just use more massive)
    let newColour = bodyA.mass >= bodyB.mass ? bodyA.colour : bodyB.colour;

    let merged = new Body(newPos, newVel, totalMass, newRadius, newColour);
    // Optionally, merge histories (concatenate and trim to length)
    merged.history = [...bodyA.history, ...bodyB.history];
    if (merged.history.length > 200) merged.history = merged.history.slice(-200);

    return merged;
}
