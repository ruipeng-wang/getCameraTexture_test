var emw = require("./emw")

export class ModelLoader {
    constructor(viewer) {
        this._viewer = viewer;
        this._app = viewer.app;
    }

    load(asset) {
        let url = asset.getFileUrl();
        wx.request({
            url: url,
            responseType: "arraybuffer",
            success: (response) => {
                this.onModelLoad(asset, response.data).then(() => {
                    this.addModel(asset);
                }).catch(err => {
                    console.log(err);
                });
            },
            error: () => {
                return console.log(err);
            }
        })
        
    }
    onModelLoad(asset, response) {
        const processBufferView = function (gltfBuffer, buffers, continuation) {
            if (gltfBuffer.extensions && gltfBuffer.extensions.EXT_meshopt_compression) {
                const extensionDef = gltfBuffer.extensions.EXT_meshopt_compression;

                const decoder = MeshoptDecoder;

                decoder.ready.then(function () {
                    const byteOffset = extensionDef.byteOffset || 0;
                    const byteLength = extensionDef.byteLength || 0;

                    const count = extensionDef.count;
                    const stride = extensionDef.byteStride;

                    const result = new Uint8Array(count * stride);
                    const source = new Uint8Array(buffers[extensionDef.buffer].buffer,
                        buffers[extensionDef.buffer].byteOffset + byteOffset,
                        byteLength);

                    decoder.decodeGltfBuffer(result, count, stride, source, extensionDef.mode, extensionDef.filter);

                    continuation(null, result);
                });
            } else {
                continuation(null, null);
            }
        };

        const processImage = function (gltfImage, continuation) {
            const u = gltfImage.uri
            if (u) {
                const textureAsset = new emw.Asset(u.filename, 'texture', {
                    url: u.url,
                    filename: u.filename
                });
                textureAsset.on('load', function () {
                    continuation(null, textureAsset);
                });
                this._app.assets.add(textureAsset);
                this._app.assets.load(textureAsset);
            } else {
                continuation(null, null);
            }
        };

        const processBuffer = function (gltfBuffer, continuation) {
            const u = gltfBuffer.uri;
            if (u) {
                const bufferAsset = new emw.Asset(u.filename, 'binary', {
                    url: u.url,
                    filename: u.filename
                });
                bufferAsset.on('load', function () {
                    continuation(null, new Uint8Array(bufferAsset.resource));
                });
                this._app.assets.add(bufferAsset);
                this._app.assets.load(bufferAsset);
            } else {
                continuation(null, null);
            }
        };

        return new Promise((resolve, reject) => {
            let url = asset.getFileUrl();
            const callback = (error, result) => {

                if (error) {
                    console.log("reject", error)
                    reject(error);
                    return;
                }

                asset.loaded = true;
                asset.resource = new emw.EMWContainerResource(result);


                let handler = this._app.loader.getHandler("emw-container");
                handler.patch(asset, this._app.assets);

                resolve();
            }

            emw.GlbParser.parseAsync(
                emw.path.getBasename(url),
                emw.path.extractPath(url),
                response,
                this._app.graphicsDevice,
                this._app.assets,
                // {},
                {
                    bufferView: {
                        processAsync: processBufferView.bind(this)
                    },
                    image: {
                        processAsync: processImage.bind(this)
                    },
                    buffer: {
                        processAsync: processBuffer.bind(this)
                    }
                },
                callback
            )

        });
    }

    addModel(modelAsset, setting) {

        let container = modelAsset.resource;
        const root = modelAsset.resource.instantiateRenderContainer({
            animation: {
                activate: false
                // loop: true
            }
        });
        root.enabled = false;
        this._app.root.addChild(root)

        this.model = root;

        let aCpt = root.getComponent('animation')
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
                        asset = this._app.assets.find(setting.audio[slot.audio].path);


                    aaCpt.addSlot(anim.name, {
                        asset: asset,
                        volume: slot.volume,
                        duration: res.duration,
                        loop: true
                    });
                }

                aaCpt.animation = aCpt;

            }
            this.animation = new ViewerAnimation(this, root);
        }

    }
    destroy(){
        this.model = null;
        this._viewer = null;
        this._app = null;
    }
}