import { Body } from './body.js';

const SUN_MASS = 333000, SUN_RADIUS = 109;

export const TEMPLATES = {
    solarSystem: {
        name: "Solar System",
        description: "The Sun, all 8 planets, and Pluto in their (roughly) correct orbits and relative masses/radii.",
        setup: function(sim, AU_IN_EARTH_RADII) {
            sim.bodies = [];

            // Helper: Convert orbital velocity (km/s) to [Earth radii/frame] for 2 hour/frame
            function v_ers_per_frame(km_s) {
                return km_s / 6371 * 7200;
            }

            // Sun (at center)
            sim.addBody(new Body([0, 0], [0, 0], SUN_MASS, SUN_RADIUS, "#ffff00")); // Sun

            // Data: [name, AU, km/s, mass, radius, color]
            const planets = [
                // Mercury
                ["Mercury", 0.387, 47.87, 0.055, 0.38, "#bebebe"],
                // Venus
                ["Venus", 0.723, 35.02, 0.815, 0.95, "#eecb8b"],
                // Earth
                ["Earth", 1.000, 29.78, 1, 1, "#1e90ff"],
                // Mars
                ["Mars", 1.524, 24.077, 0.107, 0.53, "#c1440e"],
                // Jupiter
                ["Jupiter", 5.203, 13.07, 317.8, 11.2, "#e5debd"],
                // Saturn
                ["Saturn", 9.537, 9.69, 95.2, 9.45, "#dac388"],
                // Uranus
                ["Uranus", 19.191, 6.81, 14.5, 4.01, "#90e0ef"],
                // Neptune
                ["Neptune", 30.07, 5.43, 17.1, 3.88, "#4265cc"],
                // Pluto (dwarf planet)
                ["Pluto", 39.48, 4.74, 0.00218, 0.186, "#aaaaaa"]
            ];

            for (let i = 0; i < planets.length; i++) {
                const [name, au, v_kms, mass, radius, color] = planets[i];
                // Place planets along +X, velocity +Y for circular orbits
                sim.addBody(new Body(
                    [au * AU_IN_EARTH_RADII, 0],
                    [0, v_ers_per_frame(v_kms)],
                    mass, radius, color
                ));
            }
        }
    },

    binarySystem: {
        name: "Binary System",
        description: "Two stars of similar mass orbiting a common center. Try adding a planet!",
        setup: function(sim, AU_IN_EARTH_RADII) {
            sim.bodies = [];
            // Star 1: Sun-mass, to the left
            sim.addBody(new Body(
                [-0.5 * AU_IN_EARTH_RADII, 0],
                [0, 15 / 6371 * 7200], // velocity for orbit, ~15 km/s
                SUN_MASS, SUN_RADIUS, "#ffbe4a"
            ));
            // Star 2: Sun-mass, to the right, opposite velocity
            sim.addBody(new Body(
                [0.5 * AU_IN_EARTH_RADII, 0],
                [0, -15 / 6371 * 7200],
                SUN_MASS, SUN_RADIUS, "#ffe066"
            ));
        }
    },

    threeBody: {
        name: "Three-Body",
        description: "Sun, Earth, and a third object—classic three-body chaos.",
        setup: function(sim, AU_IN_EARTH_RADII) {
            sim.bodies = [];
            // Sun
            sim.addBody(new Body([0, 0], [0, 0], SUN_MASS, SUN_RADIUS, "#ffff00"));
            // Earth
            sim.addBody(new Body(
                [1 * AU_IN_EARTH_RADII, 0],
                [0, 29.5 / 6371 * 7200],
                1, 1, "#1e90ff"
            ));
            // Rogue planet, slightly offset orbit from Earth (chaos!)
            sim.addBody(new Body(
                [1 * AU_IN_EARTH_RADII, 0.04 * AU_IN_EARTH_RADII],
                [0, 29.4 / 6371 * 7200],
                10, 1, "#fa4a6a"
            ));
        }
    },

    sunJupiterTrojan: {
        name: "Sun-Jupiter-Trojan",
        description: "Sun, Jupiter, and a Trojan asteroid at Jupiter's L4 point (stable configuration).",
        setup: function(sim, AU_IN_EARTH_RADII) {
            sim.bodies = [];
            // Sun
            sim.addBody(new Body([0, 0], [0, 0], SUN_MASS, SUN_RADIUS, "#ffff00"));
            // Jupiter
            sim.addBody(new Body(
                [5.203 * AU_IN_EARTH_RADII, 0],
                [0, 13.07 / 6371 * 7200],
                317.8, 11.2, "#e5debd"
            ));
            // L4 Trojan: 60° ahead of Jupiter
            const r = 5.203 * AU_IN_EARTH_RADII;
            const angle = Math.PI / 3; // 60 degrees
            const trojanX = r * Math.cos(angle);
            const trojanY = r * Math.sin(angle);
            // Give Trojan asteroid same orbital speed as Jupiter, perpendicular direction
            sim.addBody(new Body(
                [trojanX, trojanY],
                [-13.07 / 6371 * 7200 * Math.sin(angle),
                13.07 / 6371 * 7200 * Math.cos(angle)],
                0.00001, 0.1, "#90e0ef"
            ));
        }
    },


};
