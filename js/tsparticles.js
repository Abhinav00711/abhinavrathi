loadLightInteraction(tsParticles);

tsParticles.load("tsparticles", {
  fpsLimit: 60,
  style: {
    position: "absolute",
  },
  particles: {
    number: {
      value: 30,
      density: {
        enable: true,
        value_area: 800
      }
    },
    color: {
      value: "#ff0000",
      animation: {
        enable: true,
        speed: 20,
        sync: true
      }
    },
    shape: {
      type: ["circle", "square"]
    },
    opacity: {
      value: 1
    },
    size: {
      value: 30,
      random: {
        enable: true,
        minimumValue: 15
      }
    },
    rotate: {
      value: 0,
      direction: "clockwise",
      animation: {
        speed: 5,
        enable: true
      }
    },
    move: {
      enable: true,
      speed: 6,
      direction: "none",
      out_mode: "out"
    }
  },
  interactivity: {
    detectsOn: "canvas",
    events: {
      onHover: {
        enable: true,
        mode: "light"
      },
      resize: true
    },
    modes: {
      light: {
        area: {
          gradient: {
            start: "3b5e98",
            stop: "#17163e"
          }
        },
        shadow: {
          color: "#17163e"
        }
      }
    }
  },
  detectRetina: true,
  background: {
    color: "#17163e"
  }
});