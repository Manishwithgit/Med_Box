
const express = require('express');
const mysql = require('mysql');
const path = require('path');
const bodyparser = require('body-parser')
const cors = require('cors')
const multer = require('multer');
const csvtojson = require("csvtojson");
const { response } = require('express');

const excelFile = require("exceljs");





const app = express();


// create connection between database

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'Med_Box'
});

db.connect((err) => {
    if (err) {
        throw err;

    }
    console.log('mysql connect.....')


});



app.use(express.static('public'))
 

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname + '/index.html'));
    //__dirname : It will resolve to your project folder.

});


app.use(cors());

// body-parser middleware use......

app.use(bodyparser.json())
app.use(bodyparser.urlencoded({
    extended: true
}));

// serving static files...............................
app.use('/uploads', express.static('uploads'));

// request handlers...................
app.get('/', (req, res) => {
    res.send('Node js file upload rest apis');
});

// handle storage using multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads');

    },
    filename: function (req, file, cb) {
        cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);

    }
});

const upload = multer({ storage: storage });

// handle single file upload
app.post('/avatar', upload.single('fileload'), (req, res,) => {
    if ((req.body.container) === "quantity") {
        const file = req.file;
        // console.log(req.body.container);
        // console.log(file);
        if (!file) {
            return res.status(400).send({ message: 'Please upload a file.' });
        }

        const csvFilePath = `./uploads/${req.file.filename}`

        // console.log(req.body)
        csvtojson({ trim: true, headers: ['id', 'item_description', 'quantity', 'avg'] })
            .fromFile(csvFilePath)
            .then(async(jsonObj) => {
                try {
                    jsonObj = jsonObj.slice(1,)
                    await db.query(" INSERT INTO backup_quantity SELECT*FROM quantity");
                    await db.query("TRUNCATE TABLE quantity")
                    for (let i = 0; i < jsonObj.length; i++) {
                      await  db.query('INSERT INTO quantity SET ?', [jsonObj[i]])

                    }
                } catch (error) {
                    // console.error(error)
                }
                // console.log(jsonObj.slice(1,));

            })
        //............unwanted file uploading...............

        // console.log("csvFilePath", csvFilePath)
        // const sql = "INSERT INTO file(`name`) VALUES ('" + req.file.originalname + "')";
        // const query = db.query(sql, function (err, result) {
        //     return res.send({ message: 'File is successfully.', file });
        // });

    } else {
        const file = req.file;
        // console.log(req.body.container);
        // console.log(file);
        if (!file) {
            return res.status(400).send({ message: 'Please upload a file.' });
        }

        const csvFilePath = `./uploads/${req.file.filename}`
        //..............................Purchase sheet upload.......................    
 
        if (req.body.container == 'purchase') {
        }
        csvtojson({ trim: true, headers: ['id', 'item_description', 'purchase', 'c_stock_remark'] })
            .fromFile(csvFilePath)
            .then( async (jsonObj) => {
                try {
                    jsonObj = jsonObj.slice(1,)
                    await db.query(" TRUNCATE TABLE purchase ");
                    for (let i = 0; i < jsonObj.length; i++) {
                       await db.query('INSERT INTO purchase SET ?', [jsonObj[i]]);
                    }
                } catch (error) {
                    // console.error(error);
                }
                // console.log(jsonObj.slice(1,));

            })

        // console.log("csvFilePath", csvFilePath)
        // const sql = "INSERT INTO file(`name`) VALUES ('" + req.file.originalname + "')";
        // const query = db.query(sql, function (err, result) {
        //     return res.send({ message: 'File is successfully.', file });
        // });
    }

});

app.get('/newItem', (req, res) => {
    try {
        const pick = "select * from purchase where purchase.purchase != 0 AND item_description NOT in (select item_description from quantity)";
        db.query(pick, async (err, newItem) => {

            // console.log(newItem)

            const workbook = new excelFile.Workbook();

            const work = workbook.addWorksheet("My Items list");

            const path = "./public/files";
            work.columns = [
                { header: "id", key: "id", width: 10 },
                { header: "item_description", key: "item_description", width: 40 },
                { header: "purchase", key: "purchase", width: 10 },
                { header: "c_stock_remark", key: "c_stock_remark", width: 20 },
            ];
            let counter = 1;
            newItem.forEach((user) => {
                user.id = counter;
                work.addRow(user);
                counter++;
            });

            const data = await workbook.xlsx.writeFile(`${path}/NewItemList.xlsx`)
                .then(() => {
                    res.download(`${path}/NewItemList.xlsx`)
                    // res.send({
                    //     status: "success",
                    //     message: "file successful",
                    //     path: `${path}/users.xlsx`,
                    // })
                }).catch((err) => {
                    res.send({
                        status: "error",
                        message: "something worng with me",
                    })
                })

        });
    } catch (error) {
        console.error(error)
        throw error;
    }


});
app.get('/greateravg', async (req, res) => {
    
      
        try {
              const max = "SELECT * FROM purchase INNER JOIN quantity ON purchase.item_description=quantity.item_description AND purchase.purchase>=quantity.avg WHERE purchase.item_description=quantity.item_description";
            db.query(max, async (err, maxItem) => {
    
                // console.log(newItem)
    
                const workbook = new excelFile.Workbook();
    
                const work = workbook.addWorksheet("My MaxItems list");
    
                const path = "./public/files";
                work.columns = [ 
                    { header: "id", key: "id", width: 10 },
                    { header: "item_description", key: "item_description", width: 40 },
                    { header: "purchase", key: "purchase", width: 10 },
                    { header: "c_stock_remark", key: "c_stock_remark", width: 20 },
                    {header: "quantity", key: "quantity" , width: 10},
                    {header: "average", key: "avg" , width: 10},
                ];
                let counter = 1;
                maxItem.forEach((user) => {
                    user.id = counter;
                    work.addRow(user);
                    counter++;
                });
    
                const data = await workbook.xlsx.writeFile(`${path}/MaxItemList.xlsx`)
                    .then(() => {
                        res.download(`${path}/MaxItemList.xlsx`)
                        // res.send({
                        //     status: "success",
                        //     message: "file successful",
                        //     path: `${path}/users.xlsx`,
                        // })
                    }).catch((err) => {
                        res.send({
                            status: "error",
                            message: "something worng with me",
                        })
                    })
    
            });
        } catch (error) {
            // console.error(error);
            throw error;
        }
    
    
    });
       
app.get('/avgdouble',async (req, res) => {
    

try {
    const doubl = "SELECT * FROM purchase INNER JOIN quantity ON purchase.item_description=quantity.item_description AND purchase.c_stock_remark>=2*quantity.avg AND purchase.c_stock_remark<=3*quantity.avg WHERE purchase.purchase !=0 AND purchase.item_description=quantity.item_description";
  db.query(doubl, async (err, doublItem) => {

      // console.log(newItem)

      const workbook = new excelFile.Workbook();

      const work = workbook.addWorksheet("My DoubleItems list");

      const path = "./public/files";
      work.columns = [ 
          { header: "id", key: "id", width: 10 },
          { header: "item_description", key: "item_description", width: 40 },
          { header: "purchase", key: "purchase", width: 10 },
          { header: "c_stock_remark", key: "c_stock_remark", width: 20 },
          {header: "quantity", key: "quantity" , width: 10},
          {header: "average", key: "avg" , width: 10},
      ];
      let counter = 1;
      doublItem.forEach((user) => {
          user.id = counter;
          work.addRow(user);
          counter++;
      });

      const data = await workbook.xlsx.writeFile(`${path}/DoubleItemList.xlsx`)
          .then(() => {
              res.download(`${path}/DoubleItemList.xlsx`)
              // res.send({
              //     status: "success",
              //     message: "file successful",
              //     path: `${path}/users.xlsx`,
              // })
          }).catch((err) => {
              res.send({
                  status: "error",
                  message: "something worng with me",
              })
          })

  });
} catch (error) {
//   console.error(error);
  throw error;
}


});

app.get('/avgtriple', async(req, res) => {
   
    try {
        const triple = "SELECT * FROM purchase INNER JOIN quantity ON purchase.item_description=quantity.item_description AND purchase.c_stock_remark>=3*quantity.avg WHERE purchase.purchase !=0 AND purchase.item_description=quantity.item_description";
      db.query(triple, async (err, tripleItem) => {
    
          // console.log(newItem)
    
          const workbook = new excelFile.Workbook();
    
          const work = workbook.addWorksheet("My TripleItems list");
    
          const path = "./public/files";
          work.columns = [ 
              { header: "id", key: "id", width: 10 },
              { header: "item_description", key: "item_description", width: 40 },
              { header: "purchase", key: "purchase", width: 10 },
              { header: "c_stock_remark", key: "c_stock_remark", width: 20 },
              {header: "quantity", key: "quantity" , width: 10},
              {header: "average", key: "avg" , width: 10},
          ];
          let counter = 1;
          tripleItem.forEach((user) => {
              user.id = counter;
              work.addRow(user);
              counter++;
          });
    
          const data = await workbook.xlsx.writeFile(`${path}/TripleItemList.xlsx`)
              .then(() => {
                  res.download(`${path}/TripleItemList.xlsx`)
                  // res.send({
                  //     status: "success",
                  //     message: "file successful",
                  //     path: `${path}/users.xlsx`,
                  // })
              }).catch((err) => {
                  res.send({
                      status: "error",
                      message: "something worng",
                  })
              })
    
      });
    } catch (error) {
    //   console.error(error);
      throw error;
    }
    
    
    });


app.listen('3000', () => {
    console.log("server started on port 3000");
});





