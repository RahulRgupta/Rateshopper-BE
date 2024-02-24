import roomSchemaModel from "../model/Room";

const getRooms = async (hId,RId, otaId) => {
    const roomDetails = await roomSchemaModel.findOne({hId : hId});
      
        const activeOtasRId = roomDetails.activeRooms.find(r => {
          if(r.RId === RId){
            return r.ota;
          }
        })
  
        return  activeOtasRId.ota.map(e => {
          if(otaId){
            if(e.otaId === otaId){
              return +e.roomID
            }
          }else{
            return +e.roomID
          }
        });
}


export {getRooms}
