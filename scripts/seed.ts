#!/usr/bin/env bun
import { runSeed } from '../lib/seed'

const res = runSeed()
console.log('Seed complete. Created placeholders:', res.createdImages.length)