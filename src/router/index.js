const { PrismaClient } = require("@prisma/client");
const { Router } = require("express");
var moment = require("moment");
const router = Router();

const prisma = new PrismaClient();

router.post("/parking", async (req, res) => {
  const { name, total, two, suv, hatchback } = await req.body;
  const parking = await prisma.parking.create({
    data: {
      name,
      total,
      two,
      suv,
      hatchback,
    },
  });

  res.json({
    status: true,
    data: parking,
  });
});

router.get("/parking", async (req, res) => {
  const parking = await prisma.parking.findMany({
    include: {
      slot: true,
    },
  });
  res.json({
    status: true,
    data: parking,
  });
});

router.post("/slot", async (req, res) => {
  const { id, name, type } = await req.body;
  const parking = await prisma.parking.findUnique({
    where: { id },
    include: {
      slot: {
        where: {
          type,
        },
      },
    },
  });

  const totalSlot = parking.slot.length - 1;

  if (type === "two") {
    if (parking.two <= totalSlot) {
      return res.send({
        status: false,
        error: "No more slots for two wheeler in this parking lot",
      });
    }
  }

  if (type === "suv") {
    if (parking.suv <= totalSlot) {
      return res.send({
        status: false,
        error: "No more slots for suv in this parking lot",
      });
    }
  }

  if (type === "hatchback") {
    if (parking.hatchback <= totalSlot) {
      return res.send({
        status: false,
        error: "No more slots for hatchback in this parking lot",
      });
    }
  }

  const slot = await prisma.slot.create({
    data: {
      name,
      status: 0,
      type,
      parking: {
        connect: {
          id,
        },
      },
    },
  });

  return res.json({
    status: true,
    slot: slot,
  });
});

router.post("/park", async (req, res) => {
  const { slotId, licence, type } = req.body;

  let car = await prisma.car.findUnique({
    where: { licence },
  });

  if (!car) {
    car = await prisma.car.create({
      data: {
        licence,
        type,
      },
    });
  }

  const slot = await prisma.slot.findUnique({
    where: {
      id: slotId,
    },
  });

  if (!slot) {
    return res.send({
      status: false,
      error: "slot doesn't exist!",
    });
  }

  if (slot.status === 1) {
    return res.send({
      status: false,
      error: "This slot already taken please choose another one!",
    });
  } else {
    await prisma.slot
      .update({
        where: {
          id: slotId,
        },
        data: {
          status: 1,
        },
      })
      .then((response) => {
        console.log("updated slot", response);
      })
      .catch((err) => {
        console.log("updated slot", err);
      });
  }

  await prisma.history
    .create({
      data: {
        car: {
          connect: {
            id: car.id,
          },
        },
        slot: {
          connect: {
            id: slotId,
          },
        },
        status: 0,
      },
    })
    .then((response) => {
      res.json({
        status: true,
        data: response,
      });
    })
    .catch((err) => {
      console.log(err);
      res.json({
        status: false,
        err,
      });
    });
});

router.post("/unpark", async (req, res) => {
  const { id } = req.body;
  var now = moment(new Date());

  const history = await prisma.history.findUnique({
    where: {
      id,
    },
  });

  var duration = moment.duration(now.diff(history.createdAt));
  var hours = parseInt(duration.asHours());

  var price = parseInt(hours / 2 + 1) * 20;

  const unpark = await prisma.history
    .update({
      where: {
        id,
      },
      data: {
        price,
        exitAt: moment(now).format(),
        status: 1,
      },
      include: {
        car: true,
        slot: true,
      },
    })
    .catch((err) => {
      console.log(err);
    });

  if (unpark) {
    await prisma.slot
      .update({
        where: {
          id: unpark.slotId,
        },
        data: {
          status: 0,
        },
      })
      .catch((err) => {
        console.log(err);
      });
  }

  await res.json({
    status: true,
    data: unpark,
  });
});

router.get("/search", async (req, res) => {
  const { licence } = req.body;
  const history = await prisma.history
    .findMany({
      where: {
        car: {
          licence: {
            equals: licence,
          },
        },
      },
      include: {
        slot: true,
        car: true,
      },
    })
    .catch((err) => console.log(err));

  res.send({
    data: history,
  });
});

module.exports = router;
