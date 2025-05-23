import { Body } from './body.js';
import * as Vector from './vector.js';
import { areColliding, mergeBodies } from './collision.js';

// PHYSICAL CONSTANTS IN SIMULATION UNITS
const G_SI = 6.67430e-11;
const R_EARTH = 6.371e6; // meters
const AU = 1.495978707e11;   // meters
const M_EARTH = 5.9722e24;   // kg
const DT_SECONDS = 7200;     // 2 hours

// G in AU^3 / (Earth mass × (2hr)^2)
const G = G_SI * (DT_SECONDS * DT_SECONDS) / (R_EARTH ** 3) * M_EARTH;

export class Simulation {
    constructor(bodies = []) {
        this.bodies = [...bodies]; // Defensive copy of initial bodies
        this.time = 0;
        this.G = G;
    }

    /**
     * Advances the simulation by one timestep dt.
     * @param {number} dt
     */
    step(dt) {
        
        // Reset accelerations
        for (let body of this.bodies) {
            body.resetAcceleration();
        }

        // Compute pairwise gravitational forces
        for (let i = 0; i < this.bodies.length; i++) {
            for (let j = i + 1; j < this.bodies.length; j++) {
                let a = this.bodies[i];
                let b = this.bodies[j];

                // Vector from a to b
                let r = Vector.subtract(b.position, a.position);
                let dist = Vector.norm(r);
                // Add softening to avoid singularity!
                let softening = 1e-2; // Tweak if needed
                let forceMag = this.G * a.mass * b.mass / ((dist * dist) + softening*softening);

                // Direction (unit vector)
                let force = Vector.scale(Vector.normalize(r), forceMag);

                // Apply equal and opposite forces
                a.applyForce(force);
                b.applyForce(Vector.scale(force, -1));
            }
        }

        // Integrate (update positions and velocities)
        for (let body of this.bodies) {
            body.integrate(dt);
        }

        // Handle collisions/merging (returns new array of bodies)
        this.handleCollisions();

        // Advance time
        this.time += dt;
    }

    /**
     * Detects and handles collisions between bodies (merging).
     * Modifies this.bodies in-place.
     */
    handleCollisions() {
        let survivors = [];
        let skip = new Set(); // Bodies that have already merged

        for (let i = 0; i < this.bodies.length; i++) {
            if (skip.has(i)) continue;
            let merged = this.bodies[i];
            for (let j = i + 1; j < this.bodies.length; j++) {
                if (skip.has(j)) continue;
                if (areColliding(merged, this.bodies[j])) {
                    merged = mergeBodies(merged, this.bodies[j]);
                    skip.add(j);
                }
            }
            survivors.push(merged);
        }
        this.bodies = survivors;
    }

    /**
     * Adds a new body to the simulation.
     * @param {Body} body
     */
    addBody(body) {
        this.bodies.push(body);
    }

    /**
     * Removes a body by index.
     * @param {number} index
     */
    removeBody(index) {
        this.bodies.splice(index, 1);
    }

    /**
     * Resets the simulation time and clears bodies.
     */
    reset() {
        this.bodies = [];
        this.time = 0;
    }
}
