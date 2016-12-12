class HomeController < ApplicationController
  skip_before_filter :api_authenticate

  def index
    redirect_to '/today' if current_user
  end
end
