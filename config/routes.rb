Rails.application.routes.draw do
  devise_for :users
  root to: 'home#index'
  resources :journal_entries
  resource :media, only: [:create]
end
