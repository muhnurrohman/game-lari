(function() {
    // Menentukan variabel
    var canvas = document.getElementById('canvas');
    var ctx = canvas.getContext('2d');
    var player, score, stop, ticker;
    var ground = [],
        water = [],
        enemies = [],
        environment = [];

    // platform variables
    var platformHeight, platformLength, gapLength;
    var platformWidth = 32;
    var platformBase = canvas.height - platformWidth; // bottom row of the game
    var platformSpacer = 64;

    /**
     * Get a random number between range
     * @param {integer}
     * @param {integer}
     */
    function rand(low, high) {
        return Math.floor(Math.random() * (high - low + 1) + low);
    }

    /**
     * rentang angka
     * @param {integer} angka 
     * @param {integer}
     * @param {integer}
     */
    function bound(num, low, high) {
        return Math.max(Math.min(num, high), low);
    }

    /**
     * Objek sebelum aset memuat semua gambar
     */
    var assetLoader = (function() {
        // lokasi gambar
        this.images = {
            'bg': 'images/bg.png',
            'sky': 'images/sky.png',
            'backdrop': 'images/backdrop.png',
            'backdrop2': 'images/backdrop_ground.png',
            'grass': 'images/grass.png',
            'avatar_normal': 'images/normal_walk.png',
            'water': 'images/water.png',
            'grass1': 'images/grassMid1.png',
            'grass2': 'images/grassMid2.png',
            'bridge': 'images/bridge.png',
            'plant': 'images/plant.png',
            'bush1': 'images/bush1.png',
            'bush2': 'images/bush2.png',
            'cliff': 'images/grassCliffRight.png',
            'spikes': 'images/spikes.png',
            'box': 'images/boxCoin.png',
            'slime': 'images/slime.png'
        };

        var assetsLoaded = 0; // berapa banyak aset yang telah dimuat
        var numimages = Object.keys(this.images).length; // jumlah total aset gambar
        this.totalAssest = numimages; // total number of assets

        /**
         * Pastikan semua aset dimuat sebelum menggunakannya
         * @param {number} dic  - jenis aset ('images', 'sounds', 'fonts')
         * @param {number} name - daftar nama aset
         */
        function assetLoaded(dic, name) {
            // jangan hitung aset yang sudah dimuat
            if (this[dic][name].status !== 'loading') {
                return;
            }

            this[dic][name].status = 'loaded';
            assetsLoaded++;

            // Pemanggilang setelah selesai
            if (assetsLoaded === this.totalAssest && typeof this.finished === 'function') {
                this.finished();
            }
        }

        /**
         * Buat aset, atur panggilan balik untuk pemuatan aset, atur sumber aset
         */
        this.downloadAll = function() {
            var _this = this;
            var src;

            // load gambar
            for (var img in this.images) {
                if (this.images.hasOwnProperty(img)) {
                    src = this.images[img];

                    // membuat sebuah closure untuk event binding
                    (function(_this, img) {
                        _this.images[img] = new Image();
                        _this.images[img].status = 'loading';
                        _this.images[img].name = img;
                        _this.images[img].onload = function() { assetLoaded.call(_this, 'images', img) };
                        _this.images[img].src = src;
                    })(_this, img);
                }
            }
        }

        return {
            images: this.images,
            totalAssest: this.totalAssest,
            downloadAll: this.downloadAll
        };
    })();

    assetLoader.finished = function() {
        startGame();
    }

    /**
     * membuat Spritesheet
     * @param {string} - Path to the image.
     * @param {number} - Lebar (in px) setiap frame.
     * @param {number} - Tinggi (in px) setiap frame.
     */
    function SpriteSheet(path, frameWidth, frameHeight) {
        this.image = new Image();
        this.frameWidth = frameWidth;
        this.frameHeight = frameHeight;

        // menghitung jumlah bingkai dalam satu baris setelah gambar dimuat
        var self = this;
        this.image.onload = function() {
            self.framesPerRow = Math.floor(self.image.width / self.frameWidth);
        };

        this.image.src = path;
    }

    /**
     * membuat animation dari spritesheet.
     * @param {SpriteSheet} - spritesheet yang digunakan untuk membuat animation.
     * @param {number}      - Jumlah frame yang harus ditunggu sebelum mentransisikan animasi
     * @param {array}       - Rentang atau urutan nomor bingkai untuk animasi.
     * @param {boolean}     - Ulangi animasi setelah selesai.
     */
    function Animation(spritesheet, frameSpeed, startFrame, endFrame) {

        var animationSequence = []; // array untuk animation
        var currentFrame = 0; // frame untuk memulai
        var counter = 0; // melacak kecepatan dari frame

        // rentang awal dan akhir untuk frames
        for (var frameNumber = startFrame; frameNumber <= endFrame; frameNumber++)
            animationSequence.push(frameNumber);

        /**
         * Perbarui animasi
         */
        this.update = function() {

            // memperbarui ke frame berikutnya jika sudah waktunya
            if (counter == (frameSpeed - 1))
                currentFrame = (currentFrame + 1) % animationSequence.length;

            // merubah counter
            counter = (counter + 1) % frameSpeed;
        };

        /**
         * membuat posisi frame
         * @param {integer} x - X position to draw
         * @param {integer} y - Y position to draw
         */
        this.draw = function(x, y) {
            // mengecek baris dan kolom frame
            var row = Math.floor(animationSequence[currentFrame] / spritesheet.framesPerRow);
            var col = Math.floor(animationSequence[currentFrame] % spritesheet.framesPerRow);

            ctx.drawImage(
                spritesheet.image,
                col * spritesheet.frameWidth, row * spritesheet.frameHeight,
                spritesheet.frameWidth, spritesheet.frameHeight,
                x, y,
                spritesheet.frameWidth, spritesheet.frameHeight);
        };
    }

    /**
     * membuat latar belakang paralaks
     */
    var background = (function() {
        var sky = {};
        var backdrop = {};
        var backdrop2 = {};

        /**
         * Gambar background ke layar dengan kecepatan berbeda
         */
        this.draw = function() {
            ctx.drawImage(assetLoader.images.bg, 0, 0);

            // background
            sky.x -= sky.speed;
            backdrop.x -= backdrop.speed;
            backdrop2.x -= backdrop2.speed;

            // menggambar gambar berdampingan untuk loop
            ctx.drawImage(assetLoader.images.sky, sky.x, sky.y);
            ctx.drawImage(assetLoader.images.sky, sky.x + canvas.width, sky.y);

            ctx.drawImage(assetLoader.images.backdrop, backdrop.x, backdrop.y);
            ctx.drawImage(assetLoader.images.backdrop, backdrop.x + canvas.width, backdrop.y);

            ctx.drawImage(assetLoader.images.backdrop2, backdrop2.x, backdrop2.y);
            ctx.drawImage(assetLoader.images.backdrop2, backdrop2.x + canvas.width, backdrop2.y);

            // Jika gambar menggulir dari layar, reset
            if (sky.x + assetLoader.images.sky.width <= 0)
                sky.x = 0;
            if (backdrop.x + assetLoader.images.backdrop.width <= 0)
                backdrop.x = 0;
            if (backdrop2.x + assetLoader.images.backdrop2.width <= 0)
                backdrop2.x = 0;
        };

        /**
         * Reset background to zero
         */
        this.reset = function() {
            sky.x = 0;
            sky.y = 0;
            sky.speed = 0.2;

            backdrop.x = 0;
            backdrop.y = 0;
            backdrop.speed = 0.4;

            backdrop2.x = 0;
            backdrop2.y = 0;
            backdrop2.speed = 0.6;
        }

        return {
            draw: this.draw,
            reset: this.reset
        };
    })();

    /**
     * vektor untuk ruang 2d.
     * @param {integer} x - Center x coordinate.
     * @param {integer} y - Center y coordinate.
     * @param {integer} dx - Change in x.
     * @param {integer} dy - Change in y.
     */
    function Vector(x, y, dx, dy) {
        // position
        this.x = x || 0;
        this.y = y || 0;
        // direction
        this.dx = dx || 0;
        this.dy = dy || 0;
    }

    /**
     * Majukan posisi vektor dengan dx,dy
     */
    Vector.prototype.advance = function() {
        this.x += this.dx;
        this.y += this.dy;
    };

    /**
     * jarak minimum antara dua vektor
     * @param {Vector}
     * @return minDist
     */
    Vector.prototype.minDist = function(vec) {
        var minDist = Infinity;
        var max = Math.max(Math.abs(this.dx), Math.abs(this.dy),
            Math.abs(vec.dx), Math.abs(vec.dy));
        var slice = 1 / max;

        var x, y, distSquared;

        // bagian tengah dari setiap vektor
        var vec1 = {},
            vec2 = {};
        vec1.x = this.x + this.width / 2;
        vec1.y = this.y + this.height / 2;
        vec2.x = vec.x + vec.width / 2;
        vec2.y = vec.y + vec.height / 2;
        for (var percent = 0; percent < 1; percent += slice) {
            x = (vec1.x + this.dx * percent) - (vec2.x + vec.dx * percent);
            y = (vec1.y + this.dy * percent) - (vec2.y + vec.dy * percent);
            distSquared = x * x + y * y;

            minDist = Math.min(minDist, distSquared);
        }

        return Math.sqrt(minDist);
    };

    /**
     * The player object
     */
    var player = (function(player) {
        // menambahkan properti langsung ke objek yang diimpor pemain
        player.width = 60;
        player.height = 96;
        player.speed = 6;

        // melompat
        player.gravity = 1;
        player.dy = 0;
        player.jumpDy = -10;
        player.isFalling = false;
        player.isJumping = false;

        // spritesheets
        player.sheet = new SpriteSheet('images/normal_walk.png', player.width, player.height);
        player.walkAnim = new Animation(player.sheet, 4, 0, 15);
        player.jumpAnim = new Animation(player.sheet, 4, 15, 15);
        player.fallAnim = new Animation(player.sheet, 4, 11, 11);
        player.anim = player.walkAnim;

        Vector.call(player, 0, 0, 0, player.dy);

        var jumpCounter = 0; // berapa lama tombol lompat dapat ditekan

        /**
         * Perbarui posisi dan animasi pemain
         */
        player.update = function() {

            //melompat atau jatuh
            if (KEY_STATUS.space && player.dy === 0 && !player.isJumping) {
                player.isJumping = true;
                player.dy = player.jumpDy;
                jumpCounter = 12;
            }

            // melompat lebih tinggi jika spasi terus ditekan
            if (KEY_STATUS.space && jumpCounter) {
                player.dy = player.jumpDy;
            }

            jumpCounter = Math.max(jumpCounter - 1, 0);

            this.advance();

            // add gravity
            if (player.isFalling || player.isJumping) {
                player.dy += player.gravity;
            }

            // merubah animasi jika jatuh
            if (player.dy > 0) {
                player.anim = player.fallAnim;
            }
            // ubah animasi jika melompat
            else if (player.dy < 0) {
                player.anim = player.jumpAnim;
            } else {
                player.anim = player.walkAnim;
            }

            player.anim.update();
        };

        /**
         * Gambar pemain pada posisinya saat ini
         */
        player.draw = function() {
            player.anim.draw(player.x, player.y);
        };

        /**
         * Atur ulang posisi pemain
         */
        player.reset = function() {
            player.x = 64;
            player.y = 250;
        };

        return player;
    })(Object.create(Vector.prototype));

    /**
     * Sprites segala sesuatu yang ditarik ke layar (tanah, musuh, etc.)
     * @param {integer} x - Mulai x posisi pemain
     * @param {integer} y - Mulai y posisi pemain
     * @param {string} type - Jenis sprite
     */
    function Sprite(x, y, type) {
        this.x = x;
        this.y = y;
        this.width = platformWidth;
        this.height = platformWidth;
        this.type = type;
        Vector.call(this, x, y, 0, 0);

        /**
         * Perbarui posisi Sprite dengan kecepatan pemain
         */
        this.update = function() {
            this.dx = -player.speed;
            this.advance();
        };

        /**
         * Gambar sprite pada posisinya saat ini
         */
        this.draw = function() {
            ctx.save();
            ctx.translate(0.5, 0.5);
            ctx.drawImage(assetLoader.images[this.type], this.x, this.y);
            ctx.restore();
        };
    }
    Sprite.prototype = Object.create(Vector.prototype);

    /**
     * Dapatkan jenis platform berdasarkan ketinggian platform
     * @return Jenis platform
     */
    function getType() {
        var type;
        switch (platformHeight) {
            case 0:
            case 1:
                type = Math.random() > 0.5 ? 'grass1' : 'grass2';
                break;
            case 2:
                type = 'grass';
                break;
            case 3:
                type = 'bridge';
                break;
            case 4:
                type = 'box';
                break;
        }
        if (platformLength === 1 && platformHeight < 3 && rand(0, 3) === 0) {
            type = 'cliff';
        }

        return type;
    }

    /**
     * Perbarui semua posisi tanah dan gambar. Juga periksa tabrakan terhadap pemain.
     */
    function updateGround() {
        // animate tanah
        player.isFalling = true;
        for (var i = 0; i < ground.length; i++) {
            ground[i].update();
            ground[i].draw();

            // menghentikan pemain agar tidak jatuh saat mendarat di platform
            var angle;
            if (player.minDist(ground[i]) <= player.height / 2 + platformWidth / 2 &&
                (angle = Math.atan2(player.y - ground[i].y, player.x - ground[i].x) * 180 / Math.PI) > -130 &&
                angle < -50) {
                player.isJumping = false;
                player.isFalling = false;
                player.y = ground[i].y - player.height + 5;
                player.dy = 0;
            }
        }

        // menghilangkan tanah yang telah keluar dari layar
        if (ground[0] && ground[0].x < -platformWidth) {
            ground.splice(0, 1);
        }
    }

    /**
     * Perbarui semua posisi air dan gambar.
     */
    function updateWater() {
        // animate water
        for (var i = 0; i < water.length; i++) {
            water[i].update();
            water[i].draw();
        }

        // menghilangkan air yang keluar dari layar
        if (water[0] && water[0].x < -platformWidth) {
            var w = water.splice(0, 1)[0];
            w.x = water[water.length - 1].x + platformWidth;
            water.push(w);
        }
    }

    /**
     * Perbarui semua posisi lingkungan dan gambar
     */
    function updateEnvironment() {
        // animate lingkungan
        for (var i = 0; i < environment.length; i++) {
            environment[i].update();
            environment[i].draw();
        }

        // menghilangkan lingkungan yang telah keluar dari layar
        if (environment[0] && environment[0].x < -platformWidth) {
            environment.splice(0, 1);
        }
    }

    /**
     * Perbarui semua posisi musuh dan gambar. Juga periksa tabrakan terhadap pemain.
     */
    function updateEnemies() {
        // menghidupkan musuh
        for (var i = 0; i < enemies.length; i++) {
            enemies[i].update();
            enemies[i].draw();

            // pemain menabrak musuh
            if (player.minDist(enemies[i]) <= player.width - platformWidth / 2) {
                gameOver();
            }
        }

        // menghilangkan musuh yang telah keluar dari layar
        if (enemies[0] && enemies[0].x < -platformWidth) {
            enemies.splice(0, 1);
        }
    }

    /**
     * Perbarui posisi pemain dan gambar
     */
    function updatePlayer() {
        player.update();
        player.draw();

        // game over
        if (player.y + player.height >= canvas.height) {
            gameOver();
        }
    }

    /**
     * Munculkan sprite baru dari layar
     */
    function spawnSprites() {
        // meningkatkan skor
        score++;

        // membuat celat
        if (gapLength > 0) {
            gapLength--;
        }
        // membuat tanah
        else if (platformLength > 0) {
            var type = getType();

            ground.push(new Sprite(
                canvas.width + platformWidth % player.speed,
                platformBase - platformHeight * platformSpacer,
                type
            ));
            platformLength--;

            // tambahkan sprite lingkungan secara random
            spawnEnvironmentSprites();

            // tambahkan musuh acak
            spawnEnemySprites();
        }
        // start over
        else {
            // menambah panjang celah setiap peningkatan kecepatan 4
            gapLength = rand(player.speed - 2, player.speed);
            // hanya memungkinkan ground meningkat sebesar 1
            platformHeight = bound(rand(0, platformHeight + rand(0, 2)), 0, 4);
            platformLength = rand(Math.floor(player.speed / 2), player.speed * 4);
        }
    }

    /**
     * Munculkan sprite lingkungan baru dari screen
     */
    function spawnEnvironmentSprites() {
        if (score > 40 && rand(0, 20) === 0 && platformHeight < 3) {
            if (Math.random() > 0.5) {
                environment.push(new Sprite(
                    canvas.width + platformWidth % player.speed,
                    platformBase - platformHeight * platformSpacer - platformWidth,
                    'plant'
                ));
            } else if (platformLength > 2) {
                environment.push(new Sprite(
                    canvas.width + platformWidth % player.speed,
                    platformBase - platformHeight * platformSpacer - platformWidth,
                    'bush1'
                ));
                environment.push(new Sprite(
                    canvas.width + platformWidth % player.speed + platformWidth,
                    platformBase - platformHeight * platformSpacer - platformWidth,
                    'bush2'
                ));
            }
        }
    }

    /**
     * Memunculkan sprite musuh baru dari screen
     */
    function spawnEnemySprites() {
        if (score > 100 && Math.random() > 0.96 && enemies.length < 3 && platformLength > 5 &&
            (enemies.length ? canvas.width - enemies[enemies.length - 1].x >= platformWidth * 3 ||
                canvas.width - enemies[enemies.length - 1].x < platformWidth : true)) {
            enemies.push(new Sprite(
                canvas.width + platformWidth % player.speed,
                platformBase - platformHeight * platformSpacer - platformWidth,
                Math.random() > 0.5 ? 'spikes' : 'slime'
            ));
        }
    }

    /**
     * memngulang permainan
     */
    function animate() {
        if (!stop) {
            requestAnimFrame(animate);
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            background.draw();

            // memperbarui entitas
            updateWater();
            updateEnvironment();
            updatePlayer();
            updateGround();
            updateEnemies();

            // menggambar skor
            ctx.fillText('Score: ' + score + 'm', canvas.width - 140, 30);

            // memnculkan Sprite baru
            if (ticker % Math.floor(platformWidth / player.speed) === 0) {
                spawnSprites();
            }

            // meningkatkan kecepatan pemain hanya saat pemain melompat
            if (ticker > (Math.floor(platformWidth / player.speed) * player.speed * 20) && player.dy !== 0) {
                player.speed = bound(++player.speed, 0, 15);
                player.walkAnim.frameSpeed = Math.floor(platformWidth / player.speed) - 1;

                // reset ticker
                ticker = 0;

                // platform untuk mengisi celah yang dibuat dengan meningkatkan kecepatan pemain
                if (gapLength === 0) {
                    var type = getType();
                    ground.push(new Sprite(
                        canvas.width + platformWidth % player.speed,
                        platformBase - platformHeight * platformSpacer,
                        type
                    ));
                    platformLength--;
                }
            }

            ticker++;
        }
    }

    /**
     * Keep track of the spacebar events
     */
    var KEY_CODES = {
        32: 'space'
    };
    var KEY_STATUS = {};
    for (var code in KEY_CODES) {
        if (KEY_CODES.hasOwnProperty(code)) {
            KEY_STATUS[KEY_CODES[code]] = false;
        }
    }
    document.onkeydown = function(e) {
        var keyCode = (e.keyCode) ? e.keyCode : e.charCode;
        if (KEY_CODES[keyCode]) {
            e.preventDefault();
            KEY_STATUS[KEY_CODES[keyCode]] = true;
        }
    };
    document.onkeyup = function(e) {
        var keyCode = (e.keyCode) ? e.keyCode : e.charCode;
        if (KEY_CODES[keyCode]) {
            e.preventDefault();
            KEY_STATUS[KEY_CODES[keyCode]] = false;
        }
    };

    /**
     * 
     */
    var requestAnimFrame = (function() {
        return window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.oRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            function(callback, element) {
                window.setTimeout(callback, 1000 / 60);
            };
    })();

    /**
     * Mulai permainan - reset semua variabel dan entitas, spawn ground dan air.
     */
    function startGame() {
        document.getElementById('game-over').style.display = 'none';
        ground = [];
        water = [];
        environment = [];
        enemies = [];
        player.reset();
        ticker = 0;
        stop = false;
        score = 0;
        platformHeight = 2;
        platformLength = 15;
        gapLength = 0;

        ctx.font = '16px arial, sans-serif';

        for (var i = 0; i < 30; i++) {
            ground.push(new Sprite(i * (platformWidth - 3), platformBase - platformHeight * platformSpacer, 'grass'));
        }

        for (i = 0; i < canvas.width / 32 + 2; i++) {
            water.push(new Sprite(i * platformWidth, platformBase, 'water'));
        }

        background.reset();

        animate();
    }

    /**
     * Akhiri permainan dan mulai ulang
     */
    function gameOver() {
        stop = true;
        document.getElementById('game-over').style.display = 'block';
    }

    document.getElementById('restart').addEventListener('click', startGame);

    assetLoader.downloadAll();
})();