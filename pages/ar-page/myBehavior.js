import {
    ModelLoader
} from './loadModel';
import {
    PlatformManager,
    WechatPlatform,
    Viewer
} from './uct-ar'
import {
    LoadingManager
} from "./loading";

var emw = require("./emw");

var globalData = getApp().globalData;
globalData.emw = emw;

export let myBehavior = Behavior({
    data: {
        width: 1,
        height: 1,
        loading: true,
        sceneId: "",
        destroyed: false,
    },

    methods: {
        onReady() {

            
            wx.createSelectorQuery()
                .select('#webgl')
                .node()
                .exec(res => {
                    this.canvas = res[0].node
                    this.gl = this.canvas.getContext('webgl');

                    const info = wx.getSystemInfoSync()
                    const pixelRatio = info.pixelRatio
                    const calcSize = (width, height) => {
                        console.log(`canvas size: width = ${width} , height = ${height}`)
                        this.canvas.width = width * pixelRatio / 2
                        this.canvas.height = height * pixelRatio / 2
                        this.setData({
                            width,
                            height,
                        })
                    }
                    calcSize(info.windowWidth, info.windowHeight)

                    this.initVK()
                })
        },
        onLoad(options) {
            this.setData({
                sceneId: "vs50mxeb_cck"
            });
        },
        onUnload() {
            this.canvas.width = 0;
            this.canvas.height = 0;
            this.viewer.app.destroy();
            this.viewer.app = null;
            this.viewer = null;
            this.session.stop();
            this.session.destroy();
            this.session = null;

            if (this._program && this._program.gl) {
                this._program.gl.deleteProgram(this._program)
                this._program = null
            }
            this.disposing = true;
            PlatformManager.dispose();
            this.canvas && (this.canvas = null);
            this.setData({
                destroyed: true
            })
            this.camera = null;
        },

        initVK() {
            // 初始化 
            this.initEMW();

            // 自定义初始化
            if (this.init) this.init()

            const session = this.session = wx.createVKSession({
                track: {
                    plane: {
                        mode: 3
                    },
                },
                version: "v1",
                gl: this.gl
            })
            session.start(err => {
                if (err) return console.error('VK error: ', err)

                const canvas = this.canvas

                const calcSize = (width, height, pixelRatio) => {
                    console.log(`canvas size: width = ${width} , height = ${height}`)
                    this.canvas.width = width * pixelRatio / 2
                    this.canvas.height = height * pixelRatio / 2
                    this.setData({
                        width,
                        height,
                    })
                }

                session.on('resize', () => {
                    const info = wx.getSystemInfoSync()
                    calcSize(info.windowWidth, info.windowHeight, info.pixelRatio)
                })


                session.on('addAnchors', anchors => {
                    anchors.forEach(anchor => {
                        console.log("add");
                        let reticle = this.reticleLoader.model;
                    })
                })
                session.on('updateAnchors', anchors => {
                    anchors.forEach(anchor => {

                    })
                })
                session.on('removeAnchors', anchors => {

                })

                // 逐帧渲染
                const onFrame = timestamp => {
                    const frame = session.getVKFrame(canvas.width, canvas.height)
                    if (frame) {
                        this.render(frame);
                    }
                    session.requestAnimationFrame(onFrame)
                }
                onFrame();
            })
        },

        initReticleModel() {
            let reticleAsset = new emw.Asset('reticle', "model", {
                url: "https://emw-pub.uality.cn/drnokeie_efi/2/drnokeie_efi.glb"
            });
            let loader = new ModelLoader(this.viewer);
            loader.load(reticleAsset);
            this.reticleLoader = loader;
        },

        initEMW() {
            this.platform = new WechatPlatform(this.canvas);
            PlatformManager.set(this.platform);
            this.viewer = new Viewer(this.canvas, {
                // id: "vs50mxeb_cck",
                // version: 1
                id: this.data.sceneId
            })


            this.viewer.app.autoRender = false;
            this.camera = this.viewer._cameraEntity.camera;
            
            globalData.viewer = this.viewer;


            new LoadingManager(this.viewer, this);

            this.initReticleModel();
        },


        onTouchEnd(evt) {
            const touches = evt.changedTouches.length ? evt.changedTouches : evt.touches;
            if (touches.length === 1) {
                const reticle = this.reticleLoader.model;
                const model = this.viewer.container;
                if (reticle && reticle.enabled && !model.enabled) {
                    console.log("touchend")

                    const hitTestRes = this.session.hitTest(0.5, 0.5)
                    if (hitTestRes.length) {
                        const matrix = new emw.Mat4();
                        matrix.set(hitTestRes[0].transform);
                        model.setPosition(matrix.getTranslation());
                        // model.setEulerAngles(matrix.getEulerAngles());
                        model.enabled = true;
                        reticle.enabled = false;
                    }
                }
            }

        }
    },
})