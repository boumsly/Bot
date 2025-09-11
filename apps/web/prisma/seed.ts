import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const deps = [
    { key: "hr", name: "Human Resources" },
    { key: "sales", name: "Sales" },
    { key: "marketing", name: "Marketing" },
    { key: "csm", name: "Customer Success Manager" },
    { key: "it", name: "Information Technology" },
    { key: "finance", name: "Finance" },
    { key: "presale", name: "Pre-sales" },
  ];

  for (const d of deps) {
    await prisma.department.upsert({
      where: { key: d.key },
      update: { name: d.name },
      create: d,
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
