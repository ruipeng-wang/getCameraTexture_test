'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var animation = require('./animation.js');
var emw = require('./emw.js');

const publishPath = "https://emw-pub.uality.cn/";

class Viewer {
    constructor(canvas, options) {
        this.changeGizmoLock = false;
        this._mousePositionOrigin = this._mousePositionOrigin();


        emw.events.attach(this);
        options = options || {};

        this.sceneId = options.id;

        this.sceneVersion = options.version || 'latest';

        this.canvas = canvas;

        this.app = new emw.Application(canvas, {
            graphicsDeviceOptions: {
                preferWebGl2: true,
                antialias: true,
                alpha: true,
                preserveDrawingBuffer: false,
            },
            mouse: new emw.Mouse(canvas),
            touch: new emw.TouchDevice(canvas),
        });

        this._picker = new emw.Picker(this.app, 1024, 1024);
        this._raycast = new emw.Raycast(this.app);


        this.app.setCanvasFillMode(emw.FILLMODE_FILL_WINDOW);
        this.app.setCanvasResolution(emw.RESOLUTION_AUTO);
        this.app.resizeCanvas();

        this.app.start();
        this.app.on("update", (dt) => {
            this.fire("update", dt);
        });

        this._cameraControlEnable = true;
        this.root = new emw.Entity();
        this.app.root.addChild(this.root);


        this.initCamera();
        this.init(options);



        console.log("app", this);

        this.app.on("start", () => {
            console.log("start2");
        });

        let globalData = getApp().globalData;
        globalData.viewer = this;


    }


    initCamera() {
        this._cameraEntity = new emw.Entity("cameraControl");
        let component = this._cameraEntity.addComponent("camera", {
            layers: [0, 1, 3, 4, 1000, 1001, 1002],
            nearClip: 0.1,
            farClip: 1000
        });

        component.clearColor = new emw.Color(0, 0, 0, 0);

        this.app.root.addChild(this._cameraEntity);

        this._cameraEntity.setPosition(0,0,10);

        // this._cameraEntity.addComponent('cameraEffectSSAO').enabled = false;
        // this._cameraEntity.addComponent('cameraEffectBloom').enabled = false;

    }

    init(options) {
        let loader = new animation.Loader(this);
        let jpath = publishPath + options.id + "/" + (options.version || "latest") + "/publish.json";
        emw.http.get(jpath).then(res => {
            let scene = res.scene;

            // let skyboxAsset = new emw.Asset(scene.skybox, "cubemap", {
            //   url: publishPath + scene.skyboxHDR
            // }, {
            //   "cubemap": true,
            //   "rgbm": false
            // });

            // loader.add(skyboxAsset);

            for (let i = 0; res.audio && i < res.audio.length; i++) {
                let audio = new emw.Asset(res.audio[i].path, "audio", {
                    url: publishPath + options.id + "/" + res.audio[i].path
                });
                loader.add(audio);
            }
            let modelAsset = new emw.Asset(scene.gltf, "emw-container", {
                url: publishPath + options.id + "/" + scene.gltf.replace(/.glb$/ig, "_sceneViewer.glb")
            });


            loader.add(modelAsset);


            loader.load().then(() => {
                console.log(modelAsset, res);
                this._initModel(modelAsset, res);

                let url = publishPath + "public/skybox/059.hdr";
                url = url.replace(".hdr", ".dds");
                let skyboxAsset = new emw.Asset(scene.skybox, "cubemap", {
                    url: url
                }, {
                    "cubemap": true,
                    "rgbm": true
                });
                this.app.assets.load(skyboxAsset);
                skyboxAsset.once("load",()=>{
                    this.app.scene.setSkybox(skyboxAsset.resources);
                })
    

                this.app.scene.updateShaders = true;
                this.app.scene._skyboxIntensity = scene.skyboxIntensity;
                this.app.scene._skyboxMip = scene.skyboxMip;
                this.app.scene._toneMapping = scene.tonemapping;
                this.app.scene.exposure = scene.tonemapping_exposure;
                this.app.scene.gammaCorrection = 1;
                let skyboxRot = new emw.Quat();
                skyboxRot.setFromAxisAngle(emw.Vec3.UP, scene.skyboxAngle);
                this.app.scene.skyboxRotation = skyboxRot;

                this.app.setSkybox(skyboxAsset);

                let cameraOp = scene.camera || {};
                let component = this._cameraEntity.getComponent("camera");
                component.nearClip = isNaN(cameraOp.nearClip) ? 0.1 : cameraOp.nearClip;
                component.farClip = isNaN(cameraOp.farClip) ? 1000 : cameraOp.farClip;


                this.once("update", () => {
                    console.log("start1");
                    this.fire("start", res);
                });
            }).catch((err) => {
                if (err.asset && err.asset.type === "emw-container") {
                    wx.showModal({
                        content: "该模型暂不支持ar预览",
                        showCancel: false,
                        success() {
                            wx.navigateBack();
                        }
                    });
                }
            });
        });
    }




    _initModel(modelAsset, setting) {

        let container = modelAsset.resource;

        const root = modelAsset.resource.instantiateRenderContainer({
            animation: {
                activate: false
            }
        });
        this.root.addChild(root);
        this.container = root;
        setTimeout(() => {
            this.container.enabled = false;
        }, 1000);

        // const box = new emw.Entity("box");
        // box.addComponent("render", {
        //     type: "box",
        //     // material: new emw.StandardMaterial(),
        //     // castShadows: true,
        //     // receiveShadows: true
        // });

        // this.root.addChild(box);

        let aCpt = root.getComponent('animation');
        if (aCpt) {
            let sAudio = setting.animationAudio;
            if (sAudio && sAudio.length > 0) {
                let aaCpt = root.addComponent("animationAudio", {
                    positional: false
                });


                for (let i = 0; i < container.animations.length; i++) {
                    const anim = container.animations[i];
                    const res = anim.resource;
                    let slot = sAudio[i];
                    // if (slot)
                    //     animations[anim.name] = anim;
                    let asset;
                    if (slot.audio < 0 || !setting.audio[slot.audio])
                        asset = null;
                    else
                        asset = this.app.assets.find(setting.audio[slot.audio].path);


                    aaCpt.addSlot(anim.name, {
                        asset: asset,
                        volume: slot.volume,
                        duration: res.duration,
                        loop: true
                    });
                }

                aaCpt.animation = aCpt;

            }
            this.animation = new animation.ViewerAnimation(this, root);
        }

        root.getComponent('materialSchemes');
        root.getComponent('nodeSchemes');
    }


    _mousePositionOrigin() {
        let point = new emw.Vec2();

        return (canvas, x, y) => {
            var rect = canvas.getBoundingClientRect();
            x = (x - rect.left) / rect.width * 2 - 1;
            y = -(y - rect.top) / rect.height * 2 + 1;
            point.set(x, y);
            return point;
        }
    }
}

// uct小程序可以引用此文件导出的文件

exports.WechatPlatform = animation.WechatPlatform;
exports.PlatformManager = emw.PlatformManager;
exports.Viewer = Viewer;