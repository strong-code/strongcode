class ApplicationController < ActionController::Base
  # Prevent CSRF attacks by raising an exception.
  # For APIs, you may want to use :null_session instead.
  # protect_from_forgery with: :exception

  def api_authenticate
    token, options = ActionController::HttpAuthentication::Token.token_and_options(request)

    if token.nil?
      @user = current_user
    else
      authenticate_or_request_with_http_token do |token, opts|
          @user = User.where(api_key: token).first
      end
    end
    
    redirect_to root_path if @user.nil?
  end
end
