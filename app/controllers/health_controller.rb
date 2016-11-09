class HealthController < ApplicationController
  before_filter :set_cache_headers, :api_authenticate
  
  def index
    @body = `echo q | htop -s PERCENT_MEM | aha --line-fix`
  end

  private

  def set_cache_headers
    response.headers["Cache-Control"] = "no-cache, no-store"
    response.headers["Pragam"] = "no-cache"
    response.headers["Expires"] = "Fri, 01 Jan 1990 00:00:00 GMT"
  end

end
