/**
 * requestAnimationFrame
 */
window.requestAnimationFrame = (function () {
    return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function (callback) {
            window.setTimeout(callback, 1000 / 60);
        };
})();



/**
 * Vector
 */
function Vector(x, y) {
    this.x = x || 0;
    this.y = y || 0;
}

Vector.add = function (a, b) {
    return new Vector(a.x + b.x, a.y + b.y);
};

Vector.sub = function (a, b) {
    return new Vector(a.x - b.x, a.y - b.y);
};

Vector.prototype = {
    set: function (x, y) {
        if (typeof x === 'object') {
            y = x.y;
            x = x.x;
        }
        this.x = x || 0;
        this.y = y || 0;
        return this;
    },

    add: function (v) {
        this.x += v.x;
        this.y += v.y;
        return this;
    },

    sub: function (v) {
        this.x -= v.x;
        this.y -= v.y;
        return this;
    },

    scale: function (s) {
        this.x *= s;
        this.y *= s;
        return this;
    },

    length: function () {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    },

    normalize: function () {
        var len = Math.sqrt(this.x * this.x + this.y * this.y);
        if (len) {
            this.x /= len;
            this.y /= len;
        }
        return this;
    },

    angle: function () {
        return Math.atan2(this.y, this.x);
    },

    distanceTo: function (v) {
        var dx = v.x - this.x,
            dy = v.y - this.y;
        return Math.sqrt(dx * dx + dy * dy);
    },

    distanceToSq: function (v) {
        var dx = v.x - this.x,
            dy = v.y - this.y;
        return dx * dx + dy * dy;
    },

    clone: function () {
        return new Vector(this.x, this.y);
    }
};


/**
 * Lightning
 */
function Lightning(startPoint, endPoint, step) {
    this.startPoint = startPoint || new Vector();
    this.endPoint = endPoint || new Vector();
    this.step = step || 45;

    this.children = [];
}



Lightning.prototype = {


    color: 'rgba(255, 255, 255, 1)',
    speed: 0.025,
    amplitude: 1,
    lineWidth: 5,
    blur: 50,
    blurColor: 'rgba(255, 255, 255, 0.25)',
    points: null,
    off: 0,
    _simplexNoise: new SimplexNoise(),
    // Case by child
    parent: null,
    startStep: 0,
    endStep: 0,

    length: function () {
        return this.startPoint.distanceTo(this.endPoint);
    },

    getChildNum: function () {
        return children.length;
    },

    setChildNum: function (num) {
        var children = this.children, child,
            i, len;

        len = this.children.length;

        if (len > num) {
            for (i = num; i < len; i++) {
                children[i].dispose();
            }
            children.splice(num, len - num);

        } else {
            for (i = len; i < num; i++) {
                child = new Lightning();
                child._setAsChild(this);
                children.push(child);
            }
        }
    },

    update: function () {
        var startPoint = this.startPoint,
            endPoint = this.endPoint,
            length, normal, radian, sinv, cosv,
            points, off, waveWidth, n, av, ax, ay, bv, bx, by, m, x, y,
            children, child,
            i, len;

        if (this.parent) {
            if (this.endStep > this.parent.step) {
                this._updateStepsByParent();
            }

            startPoint.set(this.parent.points[this.startStep]);
            endPoint.set(this.parent.points[this.endStep]);
        }

        length = this.length();
        normal = Vector.sub(endPoint, startPoint).normalize().scale(length / this.step);
        radian = normal.angle();
        sinv = Math.sin(radian);
        cosv = Math.cos(radian);

        points = this.points = [];
        off = this.off += random(this.speed, this.speed * 0.2);
        waveWidth = (this.parent ? length * 1.5 : length) * this.amplitude;
        if (waveWidth > 750) waveWidth = 750;

        for (i = 0, len = this.step + 1; i < len; i++) {
            n = i / 60;
            av = waveWidth * this._noise(n - off, 0) * 0.5;
            ax = sinv * av;
            ay = cosv * av;

            bv = waveWidth * this._noise(n + off, 0) * 0.5;
            bx = sinv * bv;
            by = cosv * bv;

            m = Math.sin((Math.PI * (i / (len - 1))));

            x = startPoint.x + normal.x * i + (ax - bx) * m;
            y = startPoint.y + normal.y * i - (ay - by) * m;

            points.push(new Vector(x, y));
        }

        children = this.children;

        for (i = 0, len = children.length; i < len; i++) {
            child = children[i];
            child.color = this.color;
            child.speed = this.speed * 1.35;
            child.amplitude = this.amplitude;
            child.lineWidth = this.lineWidth * 0.75;
            child.blur = this.blur;
            child.blurColor = this.blurColor;
            children[i].update();
        }
    },

    draw: function (ctx) {
        var points = this.points,
            children = this.children,
            i, len, p, d;

        // Blur
        if (this.blur) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = 'rgba(255, 255, 0,1)';
            ctx.beginPath();
            for (i = 0, len = points.length; i < len; i++) {
                p = points[i];
                d = len > 1 ? p.distanceTo(points[i === len - 1 ? i - 1 : i + 1]) : 0;
                ctx.moveTo(p.x + d, p.y);
            }
            ctx.fill();
            ctx.restore();
        }

        ctx.save();
        ctx.lineWidth = random(this.lineWidth, 12);
        ctx.strokeStyle = this.color;
        ctx.beginPath();
        for (i = 0, len = points.length; i < len; i++) {
            p = points[i];
            ctx[i === 0 ? 'moveTo' : 'lineTo'](p.x, p.y);
        }
        ctx.stroke();
        ctx.restore();
        // Draw children
        for (i = 0, len = this.children.length; i < len; i++) {
            children[i].draw(ctx);
        }
    },

    dispose: function () {
        if (this._timeoutId) {
            clearTimeout(this._timeoutId);
        }
        this._simplexNoise = null;
    },

    _noise: function (v) {
        var octaves = 6,
            fallout = 0.5,
            amp = 1, f = 1, sum = 0,
            i;

        for (i = 0; i < octaves; ++i) {
            amp *= fallout;
            sum += amp * (this._simplexNoise.noise2D(v * f, 0) + 1) * 0.5;
            f *= 2;
        }

        return sum;
    },

    _setAsChild: function (lightning) {
        if (!(lightning instanceof Lightning)) return;
        this.parent = lightning;

        var self = this,
            setTimer = function () {
                self._updateStepsByParent();
                self._timeoutId = setTimeout(setTimer, randint(1500));
            };

        self._timeoutId = setTimeout(setTimer, randint(1500));
    },

    _updateStepsByParent: function () {
        if (!this.parent) return;
        var parentStep = this.parent.step;
        this.startStep = randint(parentStep - 2);
        this.endStep = this.startStep + randint(parentStep - this.startStep - 2) + 2;
        this.step = this.endStep - this.startStep;
    }
};

// Helpers

function random(max, min) {
    if (typeof max !== 'number') {
        return Math.random();
    } else if (typeof min !== 'number') {
        min = 0;
    }
    return Math.random() * (max - min) + min;
}


function randint(max, min) {
    if (!max) return 0;
    return random(max + 1, min) | 0;
}



// Initialize

(function () {

    // Vars

    var canvas, context,
        centerX, centerY,
        lightning;

    const N = 12;

    // Event Listeners

    function resize() {
        const bounds = canvas.getBoundingClientRect();
        canvas.width = bounds.width;
        canvas.height = bounds.height;
        centerX = canvas.width * 0.5;
        centerY = canvas.height * 0.5;
        context = canvas.getContext('2d');

        const radius = canvas.width / 3;

        lightnings.forEach((lightning, i) => {
            lightning.setChildNum(2);
            const unghi = i / N * 2 * Math.PI;
            const unghiurm = (i + 1) / N * 2 * Math.PI;
            const p1 = new Vector(centerX + radius * Math.cos(unghi), centerY + radius * Math.sin(unghi));
            const p2 = new Vector(centerX + radius * Math.cos(unghiurm), centerY + radius * Math.sin(unghiurm));
            lightning.startPoint.set(i % 2 == 0 ? p1 : p2);
            lightning.endPoint.set(i % 2 == 0 ? p2 : p1);
            lightning.step = 5; Math.ceil(lightning.length() / 10);
            if (lightning.step < 5) lightning.step = 5;
        });
    }

    // Init

    canvas = document.getElementById('fulgere');

    lightnings = new Array(N).fill().map(_ => new Lightning());

    window.addEventListener('resize', resize, false);
    resize(null);



    // Start Update

    var loop = function () {
        // context.fillStyle = "#44f";

        context.clearRect(0, 0, canvas.width, canvas.height);


        lightnings.forEach(lightning => {
            lightning.update();
            lightning.draw(context);
        })

        requestAnimationFrame(loop);
    };
    loop();

})();
