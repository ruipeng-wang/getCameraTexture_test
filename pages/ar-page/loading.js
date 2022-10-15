export class LoadingManager{
    constructor(viewer,pageInstance){
        this.viewer = viewer;
        this.pageInstance = pageInstance;
        this.viewer.once("start",()=>{
            setTimeout(()=>{
                console.log("hide loading")
                this.pageInstance.setData({
                    loading: false
                })
            },1000)
        })
    }

}