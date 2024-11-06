const asyncHandler = (requestFunction) => async (req, res, next) => {
  Promise
  .resolve(await requestFunction(req, res, next))
  .catch((err) => {
    next(err);
  });
};

export default asyncHandler;