import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const contadorSchema = new Schema({
    id: { type: String, required: true }, // O nome do contador (ex: "rnc_seq")
    seq: { type: Number, default: 0 }     // O número atual (0, 1, 2...)
});

export default model('Contador', contadorSchema);