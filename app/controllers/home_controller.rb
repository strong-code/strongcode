class HomeController < ApplicationController

  def index
    redirect_to '/today' if current_user
  end
end
