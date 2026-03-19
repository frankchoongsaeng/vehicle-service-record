import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/openauth/password.js'

const prisma = new PrismaClient()

const demoVehicles = [
    {
        key: 'rav4',
        make: 'Toyota',
        model: 'RAV4',
        year: 2021,
        trim: 'XSE Hybrid',
        vehicle_type: 'SUV',
        plate_number: 'DLG-4210',
        vin: '2T3EWRFV5MW123456',
        engine: '2.5L Hybrid I4',
        transmission: 'CVT',
        fuel_type: 'Hybrid',
        purchase_mileage: 18200,
        mileage: 48630,
        color: 'Blueprint',
        notes: 'Primary family vehicle. Usually serviced every 5,000 miles.'
    },
    {
        key: 'mazda3',
        make: 'Mazda',
        model: '3',
        year: 2018,
        trim: 'Touring',
        vehicle_type: 'Hatchback',
        plate_number: 'DLG-3188',
        vin: 'JM1BN1V34J1165432',
        engine: '2.5L Skyactiv-G',
        transmission: 'Automatic',
        fuel_type: 'Gasoline',
        purchase_mileage: 12004,
        mileage: 73410,
        color: 'Machine Gray',
        notes: 'Commuter car. Interior filter and tires usually replaced together.'
    },
    {
        key: 'porsche',
        make: 'Porsche',
        model: '911',
        year: 1997,
        trim: 'Carrera',
        vehicle_type: 'Coupe',
        plate_number: 'AIR-993',
        vin: 'WP0AA2994VS320456',
        engine: '3.6L Flat-6',
        transmission: 'Manual',
        fuel_type: 'Gasoline',
        purchase_mileage: 68120,
        mileage: 82455,
        color: 'Guards Red',
        notes: 'Weekend car. Records include specialist shops and seasonal maintenance.'
    },
    {
        key: 'lightning',
        make: 'Ford',
        model: 'F-150 Lightning',
        year: 2024,
        trim: 'Lariat',
        vehicle_type: 'Truck',
        plate_number: '',
        vin: '',
        engine: '',
        transmission: 'Automatic',
        fuel_type: 'Electric',
        purchase_mileage: undefined,
        mileage: 4120,
        color: 'Avalanche',
        notes: 'New truck with no maintenance history yet. Useful for empty-state testing.'
    }
] as const

const demoServiceRecords = [
    {
        vehicleKey: 'rav4',
        service_type: 'oil_change',
        description: 'Full synthetic oil change and OEM oil filter replacement.',
        date: '2026-03-02',
        mileage: 48210,
        cost: 79.95,
        notes: 'Next oil service sticker placed at 53,000 miles.'
    },
    {
        vehicleKey: 'rav4',
        service_type: 'tire_rotation',
        description: 'Cross rotation with pressure adjustment and tread measurement.',
        date: '2026-01-21',
        mileage: 46890,
        cost: 35,
        notes: 'Front tires had slightly higher wear on the outer shoulders.'
    },
    {
        vehicleKey: 'rav4',
        service_type: 'inspection',
        description: 'Annual state safety inspection completed with no findings.',
        date: '2025-11-15',
        mileage: 45102,
        cost: 25,
        notes: ''
    },
    {
        vehicleKey: 'mazda3',
        service_type: 'brake_service',
        description: 'Front pads and rotors replaced; caliper slide pins lubricated.',
        date: '2026-02-14',
        mileage: 72885,
        cost: 410.27,
        notes: 'Pedal feel improved immediately after bedding procedure.'
    },
    {
        vehicleKey: 'mazda3',
        service_type: 'tire_replacement',
        description: 'Installed four Michelin CrossClimate 2 tires and balanced all wheels.',
        date: '2025-12-03',
        mileage: 70155,
        cost: 892.44,
        notes: 'Alignment recommended at next visit.'
    },
    {
        vehicleKey: 'mazda3',
        service_type: 'battery',
        description: 'Battery replacement after slow winter crank and low reserve test.',
        date: '2025-01-12',
        mileage: 64580,
        cost: 198.12,
        notes: ''
    },
    {
        vehicleKey: 'mazda3',
        service_type: 'air_filter',
        description: 'Engine air filter replaced during routine service.',
        date: '2025-08-19',
        mileage: 68970,
        cost: 24.99,
        notes: ''
    },
    {
        vehicleKey: 'mazda3',
        service_type: 'cabin_filter',
        description: 'Cabin air filter replaced to address reduced HVAC airflow.',
        date: '2025-08-19',
        mileage: 68970,
        cost: 29.99,
        notes: 'Combined with engine air filter replacement.'
    },
    {
        vehicleKey: 'porsche',
        service_type: 'transmission',
        description: 'Manual gearbox fluid replaced with fresh synthetic gear oil.',
        date: '2025-10-30',
        mileage: 80110,
        cost: 188.5,
        notes: 'Shift feel improved when cold.'
    },
    {
        vehicleKey: 'porsche',
        service_type: 'coolant',
        description: 'Cooling system flushed and refilled, expansion cap replaced.',
        date: '2024-07-18',
        mileage: 77240,
        cost: 163.75,
        notes: 'Pressure test held steady.'
    },
    {
        vehicleKey: 'porsche',
        service_type: 'spark_plugs',
        description: 'Spark plugs replaced during major interval service.',
        date: '2024-07-18',
        mileage: 77240,
        cost: 142.2,
        notes: ''
    },
    {
        vehicleKey: 'porsche',
        service_type: 'timing_belt',
        description: 'Timing chain inspection and tensioner service performed by specialist.',
        date: '2023-05-06',
        mileage: 74110,
        cost: 620,
        notes: 'No abnormal wear observed.'
    },
    {
        vehicleKey: 'porsche',
        service_type: 'wiper_blades',
        description: 'Front wiper blades replaced before rainy season.',
        date: '2025-09-08',
        mileage: 79720,
        cost: 31.49,
        notes: ''
    },
    {
        vehicleKey: 'porsche',
        service_type: 'other',
        description: 'Paint protection detail and leather conditioning package.',
        date: '2026-02-08',
        mileage: null,
        cost: 275,
        notes: 'Cosmetic service only, no mechanical work performed.'
    }
] as const

const privateVehicle = {
    make: 'Honda',
    model: 'CR-V',
    year: 2020,
    trim: 'EX',
    vehicle_type: 'SUV',
    plate_number: 'HIDDEN-1',
    vin: '2HKRW2H58LH654321',
    engine: '1.5L Turbo I4',
    transmission: 'CVT',
    fuel_type: 'Gasoline',
    purchase_mileage: 9040,
    mileage: 38880,
    color: 'Modern Steel',
    notes: 'Belongs to a separate seeded user for auth scoping checks.'
} as const

async function main() {
    const email = (process.env.DEV_USER_EMAIL ?? 'demo@example.com').trim().toLowerCase()
    const password = process.env.DEV_USER_PASSWORD ?? 'change-me123'
    const secondaryEmail = 'hidden@example.com'
    const secondaryPassword = 'change-me123'

    const user = await prisma.user.upsert({
        where: { email },
        update: {
            password_hash: hashPassword(password)
        },
        create: {
            email,
            password_hash: hashPassword(password)
        }
    })

    const secondaryUser = await prisma.user.upsert({
        where: { email: secondaryEmail },
        update: {
            password_hash: hashPassword(secondaryPassword)
        },
        create: {
            email: secondaryEmail,
            password_hash: hashPassword(secondaryPassword)
        }
    })

    await prisma.serviceRecord.deleteMany({ where: { user_id: { in: [user.id, secondaryUser.id] } } })
    await prisma.vehicle.deleteMany({ where: { user_id: { in: [user.id, secondaryUser.id] } } })

    const createdVehicles = new Map<string, number>()

    for (const vehicle of demoVehicles) {
        const { key, ...vehicleData } = vehicle
        const createdVehicle = await prisma.vehicle.create({
            data: {
                user_id: user.id,
                ...vehicleData,
                plate_number: vehicleData.plate_number || null,
                vin: vehicleData.vin || null,
                engine: vehicleData.engine || null,
                purchase_mileage: vehicleData.purchase_mileage ?? null
            }
        })

        createdVehicles.set(key, createdVehicle.id)
    }

    await prisma.vehicle.create({
        data: {
            user_id: secondaryUser.id,
            ...privateVehicle
        }
    })

    for (const record of demoServiceRecords) {
        const vehicleId = createdVehicles.get(record.vehicleKey)

        if (!vehicleId) {
            throw new Error(`Missing seeded vehicle for key: ${record.vehicleKey}`)
        }

        await prisma.serviceRecord.create({
            data: {
                user_id: user.id,
                vehicle_id: vehicleId,
                service_type: record.service_type,
                description: record.description,
                date: record.date,
                mileage: record.mileage ?? null,
                cost: record.cost ?? null,
                notes: record.notes || null
            }
        })
    }

    console.log(`Seeded development user: ${email}`)
    console.log(`Development password: ${password}`)
    console.log(
        `Seeded ${demoVehicles.length} demo vehicles and ${demoServiceRecords.length} service records for ${email}`
    )
    console.log(`Seeded secondary user for auth isolation: ${secondaryEmail}`)
}

main()
    .catch(error => {
        console.error(error)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
