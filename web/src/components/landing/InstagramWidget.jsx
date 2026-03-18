import React, { useEffect, useState, useCallback, useRef } from 'react';
import InstagramWidgetFallback from './InstagramWidgetFallback';
import useEmblaCarousel from 'embla-carousel-react';
import { apiFetch, API_SERVICE_URL } from '../../config/api';
import './InstagramWidget.css';

const InstagramWidget = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [posts, setPosts] = useState([]);
  const [profile, setProfile] = useState(null);
  const [isPaused, setIsPaused] = useState(false);

  // Referências para controle do autoplay
  const autoplayRef = useRef(null);

  // Configuração do carrossel
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    loop: true, // Habilitar loop para autoplay contínuo
    skipSnaps: false,
    dragFree: true,
    containScroll: 'trimSnaps',
    slidesToScroll: 1,
    breakpoints: {
      '(min-width: 768px)': { slidesToScroll: 1 }, // Sempre 1 para autoplay suave
      '(min-width: 1024px)': { slidesToScroll: 1 }
    }
  });

  // Função para avançar para o próximo post
  const nextSlide = useCallback(() => {
    if (emblaApi && !isPaused) {
      emblaApi.scrollNext();
    }
  }, [emblaApi, isPaused]);

  // Função para iniciar o autoplay
  const startAutoplay = useCallback(() => {
    if (autoplayRef.current) {
      clearInterval(autoplayRef.current);
    }

    autoplayRef.current = setInterval(() => {
      nextSlide();
    }, 4000); // 4 segundos entre cada post
  }, [nextSlide]);

  // Função para parar o autoplay
  const stopAutoplay = useCallback(() => {
    if (autoplayRef.current) {
      clearInterval(autoplayRef.current);
      autoplayRef.current = null;
    }
  }, []);

  // Função para pausar o autoplay
  const pauseAutoplay = useCallback(() => {
    setIsPaused(true);
    stopAutoplay();
  }, [stopAutoplay]);

  // Função para retomar o autoplay
  const resumeAutoplay = useCallback(() => {
    setIsPaused(false);
    startAutoplay();
  }, [startAutoplay]);

  // Iniciar autoplay quando os posts estiverem carregados
  useEffect(() => {
    if (posts.length > 0 && emblaApi) {
      startAutoplay();
    }

    return () => {
      stopAutoplay();
    };
  }, [posts, emblaApi, startAutoplay, stopAutoplay]);

  // Limpar intervalos quando o componente for desmontado
  useEffect(() => {
    return () => {
      if (autoplayRef.current) {
        clearInterval(autoplayRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const loadInstagramData = async () => {
      try {
        const feedUrl = `/api/instagram/feed`;
        const response = await apiFetch(feedUrl);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            `Erro ao carregar feed: ${response.status} - ${errorData.detail || response.statusText}`
          );
        }

        const { profile: profileData, posts: postsData } = await response.json();

        setProfile(profileData);

        if (postsData && Array.isArray(postsData)) {
          setPosts(postsData);
        } else {
          throw new Error('Formato de dados inválido do feed');
        }

        setIsLoading(false);
      } catch (err) {
        console.error('💥 Erro ao carregar dados do Instagram:', err);
        setErrorMessage(err?.message || 'Erro desconhecido ao carregar dados');
        setError(true);
        setIsLoading(false);
      }
    };

    loadInstagramData();
  }, []);

  // Função para formatar números grandes
  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  // Se houver erro, mostrar fallback com mensagem de erro
  if (error) {
    return <InstagramWidgetFallback errorMessage={errorMessage} />;
  }

  const defaultUsername = profile ? profile.username : 'jelspaco';

  return (
    <section className="instagram-widget">
      <div className="container mx-auto px-4 md:px-6">
        {/* Header do Instagram */}
        <div className="instagram-header">
          <div className="instagram-profile-container">
            {/* Avatar */}
            <div className="instagram-avatar">
              {profile?.profile_picture_url ? (
                // Imagem real do perfil do Instagram
                <div className="w-full h-full rounded-full overflow-hidden border-2 border-transparent bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 p-0.5">
                  <div className="w-full h-full rounded-full overflow-hidden">
                    <img
                      src={profile.profile_picture_url}
                      alt={`Foto de perfil de ${profile.username}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    {/* Fallback logo personalizado (inicialmente oculto) */}
                    <div className="w-full h-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 hidden items-center justify-center">
                      <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                        <div className="text-center text-xs font-bold text-gray-800">
                          JELS
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Logo personalizado como fallback
                <div className="w-full h-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-full p-1">
                  <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                    <div className="text-center text-xs font-bold text-gray-800">
                      JELS
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Informações do perfil */}
            <div className="instagram-profile-info">
              <div className="flex items-center justify-center md:justify-start space-x-2 mb-1">
                <h2 className="instagram-username">
                  {defaultUsername}
                </h2>
                <div className="w-4 h-4 md:w-5 md:h-5 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 md:w-3 md:h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="instagram-description">Jogos Escolares de Paço do Lumiar</p>

              {/* Estatísticas em linha */}
              <div className="instagram-stats">
                <div className="instagram-stat-item">
                  <div className="font-semibold text-gray-900">
                    {profile ? formatNumber(profile.media_count) : '—'}
                  </div>
                  <div className="text-gray-600">publicações</div>
                </div>
                <div className="instagram-stat-item">
                  <div className="font-semibold text-gray-900">
                    {profile?.followers_count !== undefined ? formatNumber(profile.followers_count) : '—'}
                  </div>
                  <div className="text-gray-600">seguidores</div>
                </div>
                <div className="instagram-stat-item">
                  <div className="font-semibold text-gray-900">
                    {profile?.follows_count !== undefined ? formatNumber(profile.follows_count) : '—'}
                  </div>
                  <div className="text-gray-600">seguindo</div>
                </div>
              </div>
            </div>

            {/* Botão Seguir */}
            <div className="instagram-follow-button">
              <a
                href={`https://www.instagram.com/${defaultUsername}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
                Seguir
              </a>
            </div>
          </div>

          {/* Nota sobre dados limitados */}
          {profile && (profile.followers_count === undefined || profile.follows_count === undefined) && (
            <div className="instagram-data-note">
              <div>
                ℹ️ Algumas estatísticas podem não estar disponíveis devido às permissões da API
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Carrossel de Posts - Largura total */}
      <div className="instagram-carousel-container">
        {isLoading ? (
          <div className="instagram-loading-skeleton">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="instagram-loading-card"></div>
            ))}
          </div>
        ) : (
          <>
            {/* Botões de navegação */}
            <button
              onClick={() => {
                emblaApi?.scrollPrev();
                pauseAutoplay();
                setTimeout(resumeAutoplay, 3000);
              }}
              className="instagram-nav-button prev"
              aria-label="Post anterior"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <button
              onClick={() => {
                emblaApi?.scrollNext();
                pauseAutoplay();
                setTimeout(resumeAutoplay, 3000);
              }}
              className="instagram-nav-button next"
              aria-label="Próximo post"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Carrossel com eventos de mouse */}
            <div
              className="instagram-carousel"
              ref={emblaRef}
              onMouseEnter={pauseAutoplay}
              onMouseLeave={resumeAutoplay}
            >
              <div className="instagram-carousel-content">
                {posts.map((post) => (
                  <div key={post.id} className="instagram-post-card group">
                    <a href={post.permalink} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                      <img
                        src={post.thumbnail_url || post.media_url}
                        alt={post.caption || 'Post do Instagram'}
                        className="instagram-post-image"
                      />

                      {/* Overlay com legenda */}
                      <div className="instagram-post-overlay group-hover:bg-opacity-50">
                        <div className="instagram-post-caption group-hover:opacity-100">
                          <p>
                            {post.caption ?
                              post.caption.length > 150 ?
                                `${post.caption.substring(0, 150)}...` :
                                post.caption
                              : 'Post sem legenda'
                            }
                          </p>
                        </div>
                      </div>

                      {/* Indicador de tipo de mídia */}
                      {post.media_type === 'VIDEO' && (
                        <div className="instagram-post-type-indicator">
                          <svg fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      )}

                      {/* Data do post */}
                      <div className="instagram-post-date">
                        {new Date(post.timestamp).toLocaleDateString('pt-BR')}
                      </div>
                    </a>
                  </div>
                ))}
              </div>
            </div>

            {/* Indicadores de slide */}
            <div className="instagram-slide-indicators">
              {posts.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    emblaApi?.scrollTo(index);
                    pauseAutoplay();
                    setTimeout(resumeAutoplay, 3000);
                  }}
                  className="instagram-slide-indicator"
                  aria-label={`Ir para slide ${index + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Botão para ver mais */}
      <div className="instagram-view-more">
        <div className="text-center">
          <a
            href={`https://www.instagram.com/${defaultUsername}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="mr-2">Ver mais no Instagram</span>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
};

export default InstagramWidget;
