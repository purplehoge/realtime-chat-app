// CommonJS format for Vercel compatibility
module.exports = (req, res) => {
  res.status(200).json({ 
    message: 'Hello World',
    timestamp: new Date().toISOString(),
    method: req.method 
  });
};