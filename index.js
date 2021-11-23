import express from 'express';
import exphbs from 'express-handlebars';
import pg from 'pg';
import AvoShopper from './avo-shopper.js';
import session from 'express-session';
const Pool = pg.Pool;



const connectionString =
  process.env.DATABASE_URL || 'postgresql://localhost:5432/avo_shopper';
const pool = new Pool({
  connectionString,
	  ssl: {
    rejectUnauthorized: false,
  },
});

const avoServices = AvoShopper(pool);

const app = express();
const PORT = process.env.PORT || 3019;

// enable the req.body object - to allow us to use HTML forms
app.use(express.json());
app.use(express.urlencoded({extended: false}));

// enable the static folder...
app.use(express.static('public'));

// add more middleware to allow for templating support

app.engine('handlebars', exphbs.engine());
app.set('view engine', 'handlebars');

app.use(
    session({
      secret: 'reincarnated as a wild horse on the far off planet Nearly.',
      resave: false,
      saveUninitialized: true,
    }),
);


app.get('/', async (req, res) => {
	const topDeals = await avoServices.topFiveDeals();
  res.render('index', {
		topDeals
  });
});

app.get('/shops', async (req, res) => {
	const shops = await avoServices.listShops();
	res.render('shops/all-shops', {shops})
});
app.get('/shops/:id/deals', async (req, res) => {
	const shopId = req.params.id;
	const shopDeals = await avoServices.dealsForShop(shopId);
	const shopName = shopDeals[0].name;
	res.render('shops/shop-deals', {shopName,shopDeals})
});

app.get('/add-deal', async (req, res) => {
	const err = req.session.err;
	const shops = await avoServices.listShops();
	res.render('deals/add-deal',
		{
			shops,
			err
		});
	delete req.session.err;
});
app.post('/add-deal', async (req, res) => {
	const shopId = parseInt(req.body.shop);
	const qty = parseInt(req.body.qty);
	const price = parseFloat(req.body.price);
	if (shopId == 0 || qty == 0 || price == 0) {
		req.session.err = 'You must complete all the fields';
		res.redirect('/add-deal');
	} else {
	await avoServices.createDeal(shopId, qty, price);
	res.redirect(`/shops/${shopId}/deals`)}
});

app.get('/add-shop', async (req, res) => {
	res.render('shops/add-shop')
});
app.post('/add-shop', async (req, res) => {
	const shopName = req.body.newShop;
	if (shopName) {
		await avoServices.createShop(shopName);
		res.redirect('/shops');
	} else {
		res.redirect('/add-shop')
	}
 });

app.get('/my-deals', async (req, res) => {
	if (req.query.amount) {
	const	amount = req.query.amount
		const deals = await avoServices.recommendDeals(amount);
		res.render('deals/my-deals', {amount, deals})
	} else {
		res.render('deals/my-deals')
	}
});
app.post('/my-deals', async (req, res) => {
	//req.session.amount = req.body.amount;
	res.redirect('/my-deals');
});

// start  the server and start listening for HTTP request on the PORT number specified...
app.listen(PORT, function () {
  console.log(`AvoApp started on port ${PORT}`);
});
