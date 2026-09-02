export const getIndustryTerminology = (industry: string | null) => {
  switch (industry) {
    case 'Law':
      return {
        teamTitle: 'Legal Team',
        teamSubtitle: 'Manage attorneys, practice areas, and schedules',
        addButton: '+ Add Attorney',
        providerNameLabel: 'Attorney Name',
        providerPlaceholder: 'e.g. Jane Doe, Esq.',
        specialtyLabel: 'Practice Area',
        specialties: ['Corporate Law', 'Family Law', 'Criminal Defense', 'Real Estate', 'Intellectual Property'],
        defaultSpecialty: 'Corporate Law',
        providerTitle: 'Attorney',
        fetchScheduleMsg: "Fetching attorney's schedule...",
        confirmAddBtn: 'Confirm Attorney Addition'
      };
    case 'Salon':
      return {
        teamTitle: 'Stylist Team',
        teamSubtitle: 'Manage stylists, specialties, and schedules',
        addButton: '+ Add Stylist',
        providerNameLabel: 'Stylist Name',
        providerPlaceholder: 'e.g. Alex Smith',
        specialtyLabel: 'Specialty',
        specialties: ['Haircut', 'Coloring', 'Extensions', 'Nails', 'Makeup'],
        defaultSpecialty: 'Haircut',
        providerTitle: 'Stylist',
        fetchScheduleMsg: "Fetching stylist's schedule...",
        confirmAddBtn: 'Confirm Stylist Addition'
      };
    case 'MedSpa':
      return {
        teamTitle: 'Aesthetic Team',
        teamSubtitle: 'Manage specialists, treatments, and schedules',
        addButton: '+ Add Specialist',
        providerNameLabel: 'Specialist Name',
        providerPlaceholder: 'e.g. Sarah Jones',
        specialtyLabel: 'Treatment Specialty',
        specialties: ['Botox', 'Laser Hair Removal', 'Facials', 'CoolSculpting', 'Fillers'],
        defaultSpecialty: 'Botox',
        providerTitle: 'Specialist',
        fetchScheduleMsg: "Fetching specialist's schedule...",
        confirmAddBtn: 'Confirm Specialist Addition'
      };
    case 'Real Estate':
      return {
        teamTitle: 'Agent Team',
        teamSubtitle: 'Manage agents, specialties, and schedules',
        addButton: '+ Add Agent',
        providerNameLabel: 'Agent Name',
        providerPlaceholder: 'e.g. John Realtor',
        specialtyLabel: 'Property Type',
        specialties: ['Residential', 'Commercial', 'Leasing', 'Luxury', 'Property Management'],
        defaultSpecialty: 'Residential',
        providerTitle: 'Agent',
        fetchScheduleMsg: "Fetching agent's schedule...",
        confirmAddBtn: 'Confirm Agent Addition'
      };
    case 'Other':
      return {
        teamTitle: 'Professional Team',
        teamSubtitle: 'Manage professionals, specialties, and schedules',
        addButton: '+ Add Professional',
        providerNameLabel: 'Professional Name',
        providerPlaceholder: 'e.g. Sam Professional',
        specialtyLabel: 'Specialty',
        specialties: ['General', 'Consultant', 'Expert', 'Advisor', 'Other'],
        defaultSpecialty: 'General',
        providerTitle: 'Professional',
        fetchScheduleMsg: "Fetching schedule...",
        confirmAddBtn: 'Confirm Professional Addition'
      };
    case 'Clinic':
    default:
      return {
        teamTitle: 'Medical Team',
        teamSubtitle: 'Manage doctors, specialties, and clinical schedules',
        addButton: '+ Add Doctor',
        providerNameLabel: 'Doctor Name',
        providerPlaceholder: 'e.g. Dr. John Smith',
        specialtyLabel: 'Specialty',
        specialties: ['General Dentist', 'Orthodontist', 'Periodontist', 'Oral Surgeon', 'Pediatric Dentist'],
        defaultSpecialty: 'General Dentist',
        providerTitle: 'Doctor',
        fetchScheduleMsg: "Fetching doctor's schedule...",
        confirmAddBtn: 'Confirm Doctor Addition'
      };
  }
};
