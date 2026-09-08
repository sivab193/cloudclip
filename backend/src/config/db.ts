import mongoose from 'mongoose';
import User from '../models/User';
import Device from '../models/Device';
import Clipboard from '../models/Clipboard';
import Shared from '../models/Shared';

export const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI as string);
        console.log(`MongoDB Connected: ${conn.connection.host}`);

        // Add missing indexes without dropping operator-managed indexes on
        // every restart. Legacy index removal is an explicit migration.
        await Promise.all([
            User.createIndexes(),
            Device.createIndexes(),
            Clipboard.createIndexes(),
            Shared.createIndexes(),
        ]);
    } catch (error) {
        throw new Error('Database connection or index initialization failed', { cause: error });
    }
};
