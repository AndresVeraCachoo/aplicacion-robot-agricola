import pkg from "@prisma/client";
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

async function main() {
  const latest = await prisma.energyHistory.findFirst({
    orderBy: { id: "desc" }
  });
  console.log(latest);
}

main().catch(console.error).finally(() => prisma.$disconnect());
