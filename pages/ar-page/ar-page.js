// pages/ar-page/ar-page.js
import {
    myBehavior
} from './myBehavior'
import yuvBehavior from './yuvBehavior'

const NEAR = 0.001
const FAR = 1000

var emw = require('./emw.js');

const matrix = new emw.Mat4();
const pos = new emw.Vec3(0, 0, 10);


Component({
    /**
     * 组件的属性列表
     */
    behaviors: [myBehavior,yuvBehavior],

    properties: {

    },

    /**
     * 组件的初始数据
     */
    data: {},

    /**
     * 组件的方法列表
     */
    methods: {
        init() {
            this.initGL()
        },
        render(frame) {
            
            this.renderGL(frame);

            const camera = frame.camera

            // 修改光标位置
            const reticle = this.reticleLoader.model;
            const modal = this.viewer.container;
            if (reticle && !(modal&&modal.enabled)) {
                const hitTestRes = this.session.hitTest(0.5, 0.5)
                if (hitTestRes.length) {
                    matrix.set(hitTestRes[0].transform);
                    reticle.setPosition(matrix.getTranslation());

                    reticle.enabled = true
                } else {
                    reticle.enabled = false
                }
            }


            // 相机

            if (camera) {
                matrix.set(camera.viewMatrix).invert();
                this.camera.entity.setPosition(matrix.getTranslation());
                this.camera.entity.setEulerAngles(matrix.getEulerAngles());
                this.camera.entity.setLocalScale(matrix.getScale());

                const porjectionMatrix = camera.getProjectionMatrix(NEAR, FAR);

                matrix.set(porjectionMatrix);

                this.camera.projectionMatrix.copy(matrix);
            }

            this.viewer.app.render();
            this.camera.clearColorBuffer = false;
            this.camera.cullFaces = false;

        },

    }
})