import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Sembrando datos iniciales...')

  // Crear usuarios
  const passwordHash = await bcrypt.hash('Admin123!', 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@empresa.com' },
    update: {},
    create: {
      email: 'admin@empresa.com',
      passwordHash,
      name: 'Administrador',
      role: 'admin',
    },
  })

  await prisma.user.upsert({
    where: { email: 'director@empresa.com' },
    update: {},
    create: {
      email: 'director@empresa.com',
      passwordHash: await bcrypt.hash('Director123!', 10),
      name: 'Director de Obra',
      role: 'director',
    },
  })

  await prisma.user.upsert({
    where: { email: 'contador@empresa.com' },
    update: {},
    create: {
      email: 'contador@empresa.com',
      passwordHash: await bcrypt.hash('Contador123!', 10),
      name: 'Contador',
      role: 'contador',
    },
  })

  // Crear proveedor de ejemplo
  const proveedor = await prisma.provider.upsert({
    where: { rfc: 'CONS123456ABC' },
    update: {},
    create: {
      name: 'Constructora Ejemplo SA de CV',
      rfc: 'CONS123456ABC',
      contact: 'Juan López',
      email: 'jlopez@constructora.com',
      phone: '555-0100',
    },
  })

  // Crear proyecto de ejemplo
  const proyecto = await prisma.project.upsert({
    where: { code: 'PRY-2024-001' },
    update: {},
    create: {
      code: 'PRY-2024-001',
      name: 'Torre Residencial Alameda',
      description: 'Torre de 12 pisos con 48 departamentos y 2 niveles de sótano',
      status: 'active',
      location: 'Av. Alameda 123, CDMX',
      startDate: new Date('2024-01-15'),
      endDate: new Date('2025-06-30'),
    },
  })

  // Crear presupuesto de ejemplo
  const presupuesto = await prisma.budget.create({
    data: {
      projectId: proyecto.id,
      totalAmount: 45_000_000,
      approvedAt: new Date('2024-01-10'),
      approvedBy: admin.name,
      lineItems: {
        create: [
          {
            code: '01',
            category: 'Preliminares',
            description: 'Trabajos de demolición y limpieza',
            unit: 'Global',
            quantity: 1,
            unitPrice: 850_000,
            approvedAmount: 850_000,
            totalAmount: 850_000,
          },
          {
            code: '02',
            category: 'Cimentación',
            description: 'Cimentación profunda y sótanos',
            unit: 'Global',
            quantity: 1,
            unitPrice: 8_500_000,
            approvedAmount: 8_500_000,
            totalAmount: 8_500_000,
          },
          {
            code: '03',
            category: 'Estructura',
            description: 'Estructura de concreto armado',
            unit: 'Global',
            quantity: 1,
            unitPrice: 12_000_000,
            approvedAmount: 12_000_000,
            totalAmount: 12_000_000,
          },
          {
            code: '04',
            category: 'Albanilería',
            description: 'Muros, losas y acabados exteriores',
            unit: 'Global',
            quantity: 1,
            unitPrice: 7_500_000,
            approvedAmount: 7_500_000,
            totalAmount: 7_500_000,
          },
          {
            code: '05',
            category: 'Instalaciones',
            description: 'Instalaciones hidrosanitarias, eléctricas y especiales',
            unit: 'Global',
            quantity: 1,
            unitPrice: 9_000_000,
            approvedAmount: 9_000_000,
            totalAmount: 9_000_000,
          },
          {
            code: '06',
            category: 'Acabados',
            description: 'Acabados interiores de departamentos',
            unit: 'Global',
            quantity: 1,
            unitPrice: 5_500_000,
            approvedAmount: 5_500_000,
            totalAmount: 5_500_000,
          },
          {
            code: '07',
            category: 'Áreas comunes',
            description: 'Lobby, elevadores y áreas exteriores',
            unit: 'Global',
            quantity: 1,
            unitPrice: 1_650_000,
            approvedAmount: 1_650_000,
            totalAmount: 1_650_000,
          },
        ],
      },
    },
  })

  // Crear contrato de ejemplo
  const partidas = await prisma.budgetLineItem.findMany({ where: { budgetId: presupuesto.id } })
  const partidaEstructura = partidas.find(p => p.category === 'Estructura')

  if (partidaEstructura) {
    const contrato = await prisma.contract.create({
      data: {
        projectId: proyecto.id,
        budgetLineItemId: partidaEstructura.id,
        providerId: proveedor.id,
        contractNumber: 'CON-2024-001',
        description: 'Estructura de concreto armado Torre Alameda',
        originalAmount: 11_800_000,
        signedAt: new Date('2024-02-01'),
        startDate: new Date('2024-02-15'),
        endDate: new Date('2025-01-31'),
      },
    })

    // Aditiva de ejemplo
    await prisma.additive.create({
      data: {
        contractId: contrato.id,
        type: 'additive',
        number: 1,
        description: 'Refuerzo adicional por cambio de diseño estructural',
        amount: 320_000,
        approvedAt: new Date('2024-04-01'),
      },
    })

    // Estimación/pago de ejemplo
    await prisma.payment.create({
      data: {
        contractId: contrato.id,
        submittedById: admin.id,
        estimateNumber: 1,
        periodStart: new Date('2024-02-15'),
        periodEnd: new Date('2024-03-15'),
        percentComplete: 15,
        amount: 1_818_000,
        status: 'paid',
        invoiceNumber: 'A-001234',
        invoiceDate: new Date('2024-03-18'),
        paidAt: new Date('2024-03-25'),
      },
    })
  }

  console.log('✅ Datos iniciales creados exitosamente')
  console.log('')
  console.log('📋 Usuarios de acceso:')
  console.log('  admin@empresa.com      / Admin123!    (Administrador)')
  console.log('  director@empresa.com   / Director123! (Director de Obra)')
  console.log('  contador@empresa.com   / Contador123! (Contador)')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
