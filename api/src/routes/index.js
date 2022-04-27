const { Router } = require('express');
// Importar todos los routers;
// Ejemplo: const authRouter = require('./auth.js');
const axios = require ('axios');
const {Recipe, Diet} = require('../db');
const {API_KEY} = process.env;
const router = Router();

// Configurar los routers
// Ejemplo: router.use('/auth', authRouter);

const allApiData = async () => {   
  //usamos async para trabajar de forma asincrona ya que no sabemos 
  //cuanto va a demorar la respuesta antes de cargar la variable a la url
  const apiUrl = await axios.get(`https://api.spoonacular.com/recipes/complexSearch?apiKey=${API_KEY}&addRecipeInformation=true&number=${100}`);
  const apiInfo = await apiUrl.data.results.map(e =>{
    // uso el map para traer solo la data que necesito para mi app y no toooda la info de la api
    // tambien se puede hacer con destructuring pero preferi hacerlo asi para unificar la informacion
    // osea para mantener los nombres que queria que no eran necesariamente los que me pasaba la api
    return {
      id: e.id,
      title: e.title,
      summary: e.summary,
      spoonacularScore: e.spoonacularScore,
      healthScore: e.healthScore,
      instructions: e.analyzedInstructions.map((e) => e.steps.map((s) => s.step)),
      image: e.image,
      Diets: e.diets,
      dishTypes: e.dishTypes,
    };
  });
  return apiInfo;
}

const allDbData = async () => {
  return await Recipe.findAll({
    include:{
      //traer todas las recipes ↑ y ademas las diets ↓
      model: Diet,
      //especificamente el nombre de la diet ↓
      attributes: ['name'],
      // el through es una comprobacion, es como decir "mediante los atributos", se hace siempre.
      through: {
        attributes: [],
      }
    }
  })
}

const getAllRecipes = async () => {
  const apiData = await allApiData();
  const dbData = await allDbData();
  const allData = apiData.concat(dbData);

  return allData;
}

router.get('/recipes', async (req,res) => {
  const title = req.query.title
  let allRecipes = await getAllRecipes();
  //si me pasan un nombre por query
  if(title){
    //busco en las recetas aquella que coincida con ese nombre
    let recipeTitle = await allRecipes.filter(e => e.title.toLowerCase().includes(title.toLowerCase()));
    //si esta ? devuelvo la receta que coincide con el nombre sino : digo que aun hay ninguna receta que coincida
    recipeTitle.length ? 
    res.status(200).send(recipeTitle) : res.status(404).send('Sorry, this recipe has not been registered yet.');
  } else {
    //si query no incluye el nombre de ninguna receta las devuelvo todas 
    res.status(200).send(allRecipes);
  }
}) 

router.get('/recipes/:id', async (req,res) => {
  const id = req.params.id;
  const getAll = await getAllRecipes();
  if (id) {
    let recipeSearch = getAll.filter( e => { return e.id == id})
    recipeSearch.length ?
    res.status(200).json(recipeSearch) : res.status(404).send({ msg : 'inexistent ID' });
  }
})

router.get('/types', async (req,res) => {

  const dietDefinitions =[ 
    "gluten free",
    "ketogenic",
    "vegetarian",
    "lacto vegetarian",
    "ovo vegetarian",
    "vegan",
    "pescetarian",
    "paleo",
    "primal",
    "lowFodmap",
    "whole 30",
    "lacto ovo vegetarian",
    "paleolithic",
    "dairy free"
  ]

  dietDefinitions.forEach(e => {
    Diet.findOrCreate({
      where: { name : e }
    })
  })

  const allDiets = await Diet.findAll();
  res.send(allDiets);
})

router.post('/recipe', async (req,res) => {
  let { title, summary, spoonacularScore, healthScore, instructions, image, diets } = req.body
  
  let recipeCreated = await Recipe.create ({
    title, 
    summary, 
    spoonacularScore, 
    healthScore, 
    instructions, 
    image,
  })
  
  let dietDb = await Diet.findAll({
    where: { name : diets }
  })

  recipeCreated.addDiet(dietDb);
  res.send(recipeCreated);
})

module.exports = router;