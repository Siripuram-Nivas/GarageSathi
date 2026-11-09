import mongoose, { Schema } from 'mongoose';
import { DataLayer, JobDoc, ServiceDoc, OwnerRecord, GaragePriceDoc } from './types';
import { config } from '../config';

const serviceSchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String, default: '' },
    aliases: { type: [String], default: [] },
    pricePaise: { type: Number, required: true, min: 0 },
    category: { type: String, default: 'General' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const jobSchema = new Schema(
  {
    jobId: { type: String, required: true, unique: true, index: true },
    customerName: String,
    customerPhone: String,
    vehicleMake: String,
    vehicleModel: String,
    registrationNumber: String,
    originalTranscript: String,
    detectedLanguage: String,
    customerComplaint: String,
    mechanicNotes: String,
    symptoms: [String],
    serviceItems: [
      {
        serviceId: String,
        serviceName: String,
        quantity: Number,
        unitPricePaise: Number,
        lineTotalPaise: Number,
        _id: false,
      },
    ],
    unresolvedItems: [String],
    estimateTotalPaise: Number,
    approvalStatus: { type: String, enum: ['PENDING', 'APPROVED'] },
    currentStatus: String,
    statusHistory: [{ status: String, at: String, note: String, _id: false }],
    approvedAt: String,
    aiMode: { type: String, enum: ['mock', 'live'] },
  },
  { timestamps: true },
);

const counterSchema = new Schema({ _id: String, seq: Number });

const ownerSchema = new Schema(
  {
    username: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// Garage-specific price override. Central Service documents are never mutated.
const garagePriceSchema = new Schema(
  {
    garageId: { type: String, required: true, index: true },
    serviceId: { type: String, required: true },
    pricePaise: { type: Number, required: true, min: 0 },
    updatedBy: { type: String, default: '' },
  },
  { timestamps: true },
);
garagePriceSchema.index({ garageId: 1, serviceId: 1 }, { unique: true });

const ServiceModel = mongoose.model('Service', serviceSchema);
const JobModel = mongoose.model('JobCard', jobSchema);
const CounterModel = mongoose.model('Counter', counterSchema);
const OwnerModel = mongoose.model('Owner', ownerSchema);
const GaragePriceModel = mongoose.model('GaragePrice', garagePriceSchema);

const toService = (d: any): ServiceDoc => ({
  id: String(d._id),
  name: d.name,
  description: d.description ?? '',
  aliases: d.aliases ?? [],
  pricePaise: d.pricePaise,
  category: d.category ?? 'General',
  isActive: d.isActive !== false,
  createdAt: (d.createdAt ?? new Date()).toISOString(),
  updatedAt: (d.updatedAt ?? new Date()).toISOString(),
});

const toGaragePrice = (d: any): GaragePriceDoc => ({
  id: String(d._id),
  garageId: d.garageId,
  serviceId: d.serviceId,
  pricePaise: d.pricePaise,
  updatedBy: d.updatedBy ?? '',
  createdAt: (d.createdAt ?? new Date()).toISOString(),
  updatedAt: (d.updatedAt ?? new Date()).toISOString(),
});

const toJob = (d: any): JobDoc => ({  id: String(d._id),
  jobId: d.jobId,
  customerName: d.customerName ?? '',
  customerPhone: d.customerPhone ?? '',
  vehicleMake: d.vehicleMake ?? '',
  vehicleModel: d.vehicleModel ?? '',
  registrationNumber: d.registrationNumber ?? '',
  originalTranscript: d.originalTranscript ?? '',
  detectedLanguage: d.detectedLanguage ?? '',
  customerComplaint: d.customerComplaint ?? '',
  mechanicNotes: d.mechanicNotes ?? '',
  symptoms: d.symptoms ?? [],
  serviceItems: (d.serviceItems ?? []).map((i: any) => ({
    serviceId: i.serviceId,
    serviceName: i.serviceName,
    quantity: i.quantity,
    unitPricePaise: i.unitPricePaise,
    lineTotalPaise: i.lineTotalPaise,
  })),
  unresolvedItems: d.unresolvedItems ?? [],
  estimateTotalPaise: d.estimateTotalPaise ?? 0,
  approvalStatus: d.approvalStatus,
  currentStatus: d.currentStatus,
  statusHistory: (d.statusHistory ?? []).map((s: any) => ({ status: s.status, at: s.at, note: s.note })),
  approvedAt: d.approvedAt,
  aiMode: d.aiMode,
  createdAt: d.createdAt.toISOString(),
  updatedAt: d.updatedAt.toISOString(),
});

export const mongoDb: DataLayer = {
  mode: 'mongodb',
  services: {
    async list() {
      return (await ServiceModel.find().sort({ name: 1 }).lean()).map(toService);
    },
    async create(input) {
      const created = await ServiceModel.create(input);
      return toService(created.toObject());
    },
    async update(id, patch) {
      if (!mongoose.isValidObjectId(id)) return null;
      const doc = await ServiceModel.findByIdAndUpdate(id, patch, { new: true }).lean();
      return doc ? toService(doc) : null;
    },
    async upsertSeeds(items) {
      for (const item of items) {
        await ServiceModel.updateOne({ name: item.name }, { $setOnInsert: item }, { upsert: true });
      }
    },
    async reset() {
      await ServiceModel.deleteMany({});
    },
  },
  jobs: {
    async create(input) {
      const created = await JobModel.create(input);
      return toJob(created.toObject());
    },
    async list() {
      return (await JobModel.find().sort({ createdAt: -1 }).lean()).map(toJob);
    },
    async find(idOrJobId) {
      const query = mongoose.isValidObjectId(idOrJobId)
        ? { $or: [{ jobId: idOrJobId }, { _id: idOrJobId }] }
        : { jobId: idOrJobId };
      const doc = await JobModel.findOne(query).lean();
      return doc ? toJob(doc) : null;
    },
    async update(idOrJobId, patch) {
      const query = mongoose.isValidObjectId(idOrJobId)
        ? { $or: [{ jobId: idOrJobId }, { _id: idOrJobId }] }
        : { jobId: idOrJobId };
      const doc = await JobModel.findOneAndUpdate(query, patch, { new: true }).lean();
      return doc ? toJob(doc) : null;
    },
    async reset() {
      await JobModel.deleteMany({});
    },
  },
  auth: {
    async get() {
      const doc = await OwnerModel.findOne().lean();
      if (!doc) return null;
      return {
        id: String(doc._id),
        username: doc.username,
        passwordHash: doc.passwordHash,
        createdAt: doc.createdAt.toISOString(),
      } as OwnerRecord;
    },
    async create(input) {
      const created = await OwnerModel.create({ username: input.username, passwordHash: input.passwordHash });
      return {
        id: String(created._id),
        username: created.username,
        passwordHash: created.passwordHash,
        createdAt: created.createdAt.toISOString(),
      } as OwnerRecord;
    },
    async reset() {
      await OwnerModel.deleteMany({});
    },
  },
  garagePrices: {
    async list(garageId) {
      return (await GaragePriceModel.find({ garageId }).lean()).map(toGaragePrice);
    },
    async upsert(input) {
      const doc = await GaragePriceModel.findOneAndUpdate(
        { garageId: input.garageId, serviceId: input.serviceId },
        { $set: { pricePaise: input.pricePaise, updatedBy: input.updatedBy } },
        { upsert: true, new: true },
      ).lean();
      return toGaragePrice(doc);
    },
    async reset() {
      await GaragePriceModel.deleteMany({});
    },
  },
  async nextJobSeq() {
    const counter = await CounterModel.findOneAndUpdate(
      { _id: 'jobs' },
      { $inc: { seq: 1 } },
      { upsert: true, new: true },
    ).lean();
    return counter?.seq ?? 1001;
  },
  async reset() {
    await Promise.all([
      ServiceModel.deleteMany({}),
      JobModel.deleteMany({}),
      CounterModel.deleteMany({}),
      OwnerModel.deleteMany({}),
      GaragePriceModel.deleteMany({}),
    ]);
  },
};

export async function connectMongo() {
  await mongoose.connect(config.mongodbUri, { serverSelectionTimeoutMS: 8000 });
  return mongoose.connection;
}
