import getHotelRankingRouter from './userDashboard.routes.js';
import adminRouter from './admin.routes.js'
import userRouter from './user.routes.js'
import contactRouter from './contactus.routes.js'
import jsonUploads from './jsonUploads.routes.js'

function initialize(app) {
  app.use('/api/dashboard', getHotelRankingRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/user', userRouter);
  app.use('/api/contactus', contactRouter);
  app.use('/api/json', jsonUploads);
}

export default initialize;  