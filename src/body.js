export class Body {
    /**
     * Construct a new Body (planet, particle, etc).
     * @param {Array} position [x, y] array (or [x, y, z] for 3D)
     * @param {Array} velocity [vx, vy] array (or [vx, vy, vz])
     * @param {number} mass
     * @param {number} radius
     * @param {string} colour (any CSS colour: "red", "#ff0000", "rgb(255,0,0)", etc)
     */
    constructor(position, velocity, mass, radius, colour="white") {
        this.position = [...position];   // Defensive copy
        this.velocity = [...velocity];   // Defensive copy
        this.mass = mass;
        this.radius = radius;
        this.colour = colour;
        this.history = [];

        // Initialize acceleration for this frame (used in sim loop)
        this.acceleration = new Array(position.length).fill(0);
    }

    /**
     * Resets the body's acceleration for the next frame.
     */
    resetAcceleration() {
        this.acceleration.fill(0);
    }

    /**
     * Apply a force vector to this body (adds to acceleration).
     * @param {Array} force [fx, fy]
     */
    applyForce(force) {
        // a = F / m, applied componentwise
        for (let i = 0; i < this.acceleration.length; i++) {
            this.acceleration[i] += force[i] / this.mass;
        }
    }

    /**
     * Update velocity and position using current acceleration (Euler integration).
     * @param {number} dt Time step (seconds)
     */
    integrate(dt) {
        for (let i = 0; i < this.position.length; i++) {
            this.velocity[i] += this.acceleration[i] * dt;
            this.position[i] += this.velocity[i] * dt;
        }

        this.history.push([...this.position]);
        if (this.history.length > 4000) this.history.shift(); // Limit trail length
    }

    /**
     * Draw the body on a 2D canvas context.
     * @param {CanvasRenderingContext2D} ctx 
     */
    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.position[0], this.position[1], this.radius, 0, 2 * Math.PI, false);
        ctx.fillStyle = this.colour;
        ctx.fill();
        ctx.strokeStyle = "black";
        ctx.stroke();
    }

    drawHistory(ctx) {
        if (this.history.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(this.history[0][0], this.history[0][1]);
        for (let i = 1; i < this.history.length; i++) {
            ctx.lineTo(this.history[i][0], this.history[i][1]);
        }
        ctx.strokeStyle = this.colour;
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}
