class WeightsController < ApplicationController
  before_filter :api_authenticate

  def new
    @weight = Weight.new
  end

  def create
    @weight = Weight.new(weight_params)
  end

  private

  def weight_params
    params.require(:weight).permit(:weight)
  end

end
