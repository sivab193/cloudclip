import mongoose from 'mongoose';
import User from '../models/User';
import Device from '../models/Device';
import Clipboard from '../models/Clipboard';
import Shared from '../models/Shared';

export const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI as string);
        console.log(`MongoDB Connected: ${conn.connection.host}`);

        // Reconcile schema indexes with the live collections. This drops the
        // legacy global-unique deviceId_1 index in favor of {userId, deviceId}
        // and creates the TTL/compound indexes on existing deployments.
        await Promise.all([
            User.syncIndexes(),
            Device.syncIndexes(),
            Clipboard.syncIndexes(),
            Shared.syncIndexes(),
        ]);
    } catch (error) {
        console.error(`Error connecting to MongoDB: ${error}`);
        process.exit(1);
    }
};
