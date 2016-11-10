class WeightsController < ApplicationController
  before_filter :api_authenticate

  def new
    @weight = Weight.new
  end

  def create
    @weight = Weight.new(weight_params)
    @weight.date = Date.new

    if @weight.save
      flash[:success] = "Weight recorded"
      redirect_to '/today'
    else
      flash[:error] = "Error. Unable to save"
      redirect_to @weight
    end
  end

  private

  def weight_params
    params.require(:weight).permit(:weight)
  end

end
