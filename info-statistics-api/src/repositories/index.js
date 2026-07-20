const jsonRepository = require('./jsonRegistrationRepository');
const supabaseRepository = require('./supabaseRegistrationRepository');
const { hasSupabaseConfig } = require('../config/env');

module.exports = hasSupabaseConfig() ? supabaseRepository : jsonRepository;
